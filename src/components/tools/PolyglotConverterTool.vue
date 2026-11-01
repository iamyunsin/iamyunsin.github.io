<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Props>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

// Source & Target types
export type SourceInputType = 'json' | 'yaml' | 'sql-ddl' | 'curl';
export type TargetLanguageType =
  | 'typescript-both'
  | 'typescript-interface'
  | 'typescript-zod'
  | 'go-struct'
  | 'rust-struct'
  | 'python-pydantic';

const sourceType = ref<SourceInputType>('json');
const targetLang = ref<TargetLanguageType>('typescript-both');

// Converter Options
const rootTypeName = ref<string>('UserProfile');
const camelCaseFields = ref<boolean>(true);
const optionalFields = ref<boolean>(false);
const strictMode = ref<boolean>(true);
const includeComments = ref<boolean>(true);

// Clean Mode Detection (V2EX / HN)
const isCleanMode = ref<boolean>(false);

onMounted(() => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || '';
    const source = params.get('source') || '';
    const utmSource = params.get('utm_source') || '';
    const clean = params.get('clean') || '';

    if (
      ref === 'v2ex' ||
      source === 'hn' ||
      utmSource === 'reddit' ||
      utmSource === 'v2ex' ||
      clean === '1' ||
      clean === 'true'
    ) {
      isCleanMode.value = true;
    }
  }
});

// Preset Samples
const sampleInputs: Record<SourceInputType, string> = {
  json: `{
  "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "username": "alan_turing",
  "email": "alan@yunsin.top",
  "age": 41,
  "accountBalance": 1250.75,
  "isActive": true,
  "createdAt": "2026-10-31T12:00:00Z",
  "tags": ["cryptography", "math", "indie-hacker"],
  "preferences": {
    "theme": "dark",
    "notificationsEnabled": true,
    "loginAttempts": 2
  }
}`,
  yaml: `id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
username: "alan_turing"
email: "alan@yunsin.top"
age: 41
accountBalance: 1250.75
isActive: true
createdAt: "2026-10-31T12:00:00Z"
tags:
  - "cryptography"
  - "math"
  - "indie-hacker"
preferences:
  theme: "dark"
  notificationsEnabled: true
  loginAttempts: 2`,
  'sql-ddl': `CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    age INT,
    account_balance DECIMAL(12, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    bio TEXT
);`,
  curl: `curl -X POST https://api.yunsin.top/v1/users \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sec_tok_991823" \\
  -d '{
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "username": "alan_turing",
    "email": "alan@yunsin.top",
    "age": 41,
    "accountBalance": 1250.75,
    "isActive": true,
    "createdAt": "2026-10-31T12:00:00Z",
    "tags": ["cryptography", "math"]
  }'`,
};

const inputCode = ref<string>(sampleInputs.json);

watch(sourceType, (newType) => {
  inputCode.value = sampleInputs[newType];
  if (newType === 'sql-ddl') {
    rootTypeName.value = 'UserProfile';
  }
});

// Intermediate Representation (IR)
export type IrFieldType =
  | 'string'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'datetime'
  | 'uuid'
  | 'array'
  | 'object'
  | 'any';

export interface IrField {
  rawName: string;
  name: string;
  type: IrFieldType;
  arrayItemType?: IrFieldType;
  arrayItemObject?: IrEntity;
  objectEntity?: IrEntity;
  isOptional: boolean;
  comment?: string;
}

export interface IrEntity {
  name: string;
  fields: IrField[];
}

function toCamelCase(str: string): string {
  return str
    .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^([A-Z])/, (_, c) => c.toLowerCase());
}

function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/-/g, '_');
}

// Type detection heuristics
function inferPrimitiveType(val: any): IrFieldType {
  if (val === null || val === undefined) return 'any';
  if (typeof val === 'boolean') return 'boolean';
  if (typeof val === 'number') {
    return Number.isInteger(val) ? 'integer' : 'float';
  }
  if (typeof val === 'string') {
    // UUID v4 check
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val)) {
      return 'uuid';
    }
    // ISO 8601 date check
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/.test(val)) {
      return 'datetime';
    }
    return 'string';
  }
  if (Array.isArray(val)) return 'array';
  if (typeof val === 'object') return 'object';
  return 'any';
}

// 1. JSON Parser
function parseJsonToIr(jsonStr: string, entityName: string): IrEntity {
  const parsed = JSON.parse(jsonStr);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Top-level JSON must be an object');
  }

  const fields: IrField[] = [];
  for (const [k, v] of Object.entries(parsed)) {
    const fieldType = inferPrimitiveType(v);
    const fieldName = camelCaseFields.value ? toCamelCase(k) : k;

    if (fieldType === 'object' && v !== null && !Array.isArray(v)) {
      const subEntity = parseJsonToIr(JSON.stringify(v), toPascalCase(k));
      fields.push({
        rawName: k,
        name: fieldName,
        type: 'object',
        objectEntity: subEntity,
        isOptional: optionalFields.value,
      });
    } else if (fieldType === 'array' && Array.isArray(v)) {
      if (v.length > 0) {
        const firstItem = v[0];
        const itemType = inferPrimitiveType(firstItem);
        if (itemType === 'object' && firstItem !== null) {
          const subEntity = parseJsonToIr(JSON.stringify(firstItem), toPascalCase(k) + 'Item');
          fields.push({
            rawName: k,
            name: fieldName,
            type: 'array',
            arrayItemType: 'object',
            arrayItemObject: subEntity,
            isOptional: optionalFields.value,
          });
        } else {
          fields.push({
            rawName: k,
            name: fieldName,
            type: 'array',
            arrayItemType: itemType,
            isOptional: optionalFields.value,
          });
        }
      } else {
        fields.push({
          rawName: k,
          name: fieldName,
          type: 'array',
          arrayItemType: 'string',
          isOptional: optionalFields.value,
        });
      }
    } else {
      fields.push({
        rawName: k,
        name: fieldName,
        type: fieldType,
        isOptional: optionalFields.value || v === null,
      });
    }
  }

  return { name: entityName, fields };
}

// 2. YAML Parser (Robust Client-Side Indentation Tokenizer)
function parseYamlToIr(yamlStr: string, entityName: string): IrEntity {
  const lines = yamlStr.split('\n');
  const resultObj: Record<string, any> = {};
  let currentArrayKey: string | null = null;
  let currentArray: any[] = [];
  let currentObjKey: string | null = null;
  let currentSubObj: Record<string, any> = {};

  for (let rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line || line.trim().startsWith('#')) continue;

    const trimmed = line.trim();

    // Check list item: "  - item"
    if (trimmed.startsWith('- ') && currentArrayKey) {
      const valStr = trimmed.slice(2).trim();
      currentArray.push(parseYamlValue(valStr));
      continue;
    }

    // Flush array if leaving list context
    if (currentArrayKey && !line.startsWith(' ') && !line.startsWith('\t')) {
      resultObj[currentArrayKey] = currentArray;
      currentArrayKey = null;
      currentArray = [];
    }

    // Flush sub-object if leaving nested context
    if (currentObjKey && !line.startsWith(' ') && !line.startsWith('\t')) {
      resultObj[currentObjKey] = currentSubObj;
      currentObjKey = null;
      currentSubObj = {};
    }

    // Nested object field
    if (currentObjKey && (line.startsWith('  ') || line.startsWith('\t'))) {
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx !== -1) {
        const subK = trimmed.slice(0, colonIdx).trim().replace(/^['"]|['"]$/g, '');
        const subV = trimmed.slice(colonIdx + 1).trim();
        currentSubObj[subK] = parseYamlValue(subV);
      }
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim().replace(/^['"]|['"]$/g, '');
      const valStr = line.slice(colonIdx + 1).trim();

      if (!valStr) {
        // Lookahead to see if next line is array or object
        currentArrayKey = key;
        currentArray = [];
        currentObjKey = key;
        currentSubObj = {};
      } else {
        resultObj[key] = parseYamlValue(valStr);
      }
    }
  }

  if (currentArrayKey && currentArray.length > 0) {
    resultObj[currentArrayKey] = currentArray;
  }
  if (currentObjKey && Object.keys(currentSubObj).length > 0) {
    resultObj[currentObjKey] = currentSubObj;
  }

  return parseJsonToIr(JSON.stringify(resultObj), entityName);
}

function parseYamlValue(valStr: string): any {
  if (valStr === '' || valStr === '~' || valStr.toLowerCase() === 'null') return null;
  if (valStr.toLowerCase() === 'true') return true;
  if (valStr.toLowerCase() === 'false') return false;
  if (/^-?\d+$/.test(valStr)) return parseInt(valStr, 10);
  if (/^-?\d+\.\d+$/.test(valStr)) return parseFloat(valStr);
  return valStr.replace(/^['"]|['"]$/g, '');
}

// 3. SQL DDL Parser
function parseSqlDdlToIr(sqlStr: string, fallbackName: string): IrEntity {
  // Find CREATE TABLE [IF NOT EXISTS] name (...)
  const tableMatch = sqlStr.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:["`]?\w+["`]?\.)?["`]?(\w+)["`]?\s*\(([\s\S]+)\)/i);
  if (!tableMatch) {
    throw new Error(isEn.value ? 'Could not find a valid CREATE TABLE statement.' : '未找到有效的 CREATE TABLE 语法结构');
  }

  const tableName = tableMatch[1];
  const body = tableMatch[2];
  const entityName = toPascalCase(tableName) || fallbackName;

  const lines = body.split('\n');
  const fields: IrField[] = [];

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('--') || line.startsWith('/*')) continue;

    // Check for primary key / constraint standalone line
    if (/^(PRIMARY\s+KEY|CONSTRAINT|UNIQUE|FOREIGN\s+KEY|KEY)\b/i.test(line)) {
      continue;
    }

    const colMatch = line.match(/^["`]?(\w+)["`]?\s+([A-Za-z0-9_]+(?:\s*\([^)]+\))?)([\s\S]*?)(?:,|$)/);
    if (!colMatch) continue;

    const rawColName = colMatch[1];
    const rawColType = colMatch[2].toUpperCase();
    const constraints = colMatch[3].toUpperCase();

    const isNotNull = /NOT\s+NULL|PRIMARY\s+KEY/i.test(constraints);
    const isOptional = optionalFields.value || !isNotNull;

    let fieldType: IrFieldType = 'string';
    if (/INT|SERIAL|BIGINT|SMALLINT|TINYINT/i.test(rawColType)) {
      fieldType = 'integer';
    } else if (/DECIMAL|NUMERIC|FLOAT|DOUBLE|REAL/i.test(rawColType)) {
      fieldType = 'float';
    } else if (/BOOL|BOOLEAN/i.test(rawColType)) {
      fieldType = 'boolean';
    } else if (/UUID/i.test(rawColType)) {
      fieldType = 'uuid';
    } else if (/TIMESTAMP|DATETIME|DATE/i.test(rawColType)) {
      fieldType = 'datetime';
    } else if (/JSON|JSONB/i.test(rawColType)) {
      fieldType = 'any';
    }

    fields.push({
      rawName: rawColName,
      name: camelCaseFields.value ? toCamelCase(rawColName) : rawColName,
      type: fieldType,
      isOptional,
      comment: constraints.trim() ? constraints.trim() : undefined,
    });
  }

  return { name: entityName, fields };
}

// 4. cURL Parser
function parseCurlToIr(curlStr: string, entityName: string): IrEntity {
  // Extract body payload: -d '...', --data '...', or --data-raw '...'
  const dataMatch = curlStr.match(/(?:--data|--data-raw|-d)\s+['"]([\s\S]*?)['"](?:\s|$)/);
  if (dataMatch && dataMatch[1]) {
    try {
      return parseJsonToIr(dataMatch[1].trim(), entityName);
    } catch {
      // Body is not json, fallback
    }
  }

  // Fallback: try parsing JSON directly if present
  const firstBrace = curlStr.indexOf('{');
  const lastBrace = curlStr.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonSub = curlStr.slice(firstBrace, lastBrace + 1);
    return parseJsonToIr(jsonSub, entityName);
  }

  throw new Error(
    isEn.value
      ? 'cURL command must contain a JSON payload in -d or --data.'
      : 'cURL 命令中未检测到包含在 -d 或 --data 中的 JSON 请求体载荷。'
  );
}

// Unified Parsed IR
const parsedIr = computed<IrEntity>(() => {
  const root = rootTypeName.value.trim() || 'AutoGenerated';
  const text = inputCode.value.trim();
  if (!text) return { name: root, fields: [] };

  switch (sourceType.value) {
    case 'json':
      return parseJsonToIr(text, root);
    case 'yaml':
      return parseYamlToIr(text, root);
    case 'sql-ddl':
      return parseSqlDdlToIr(text, root);
    case 'curl':
      return parseCurlToIr(text, root);
    default:
      return parseJsonToIr(text, root);
  }
});

// Code Generators
function genTsType(field: IrField): string {
  switch (field.type) {
    case 'string':
    case 'uuid':
    case 'datetime':
      return 'string';
    case 'integer':
    case 'float':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'any':
      return 'any';
    case 'object':
      return field.objectEntity ? field.objectEntity.name : 'Record<string, any>';
    case 'array':
      if (field.arrayItemObject) return `${field.arrayItemObject.name}[]`;
      if (field.arrayItemType) {
        if (field.arrayItemType === 'integer' || field.arrayItemType === 'float') return 'number[]';
        if (field.arrayItemType === 'boolean') return 'boolean[]';
        return 'string[]';
      }
      return 'any[]';
    default:
      return 'any';
  }
}

function genZodType(field: IrField): string {
  let zType = 'z.string()';
  switch (field.type) {
    case 'uuid':
      zType = 'z.string().uuid()';
      break;
    case 'datetime':
      zType = 'z.string().datetime()';
      break;
    case 'string':
      zType = 'z.string()';
      break;
    case 'integer':
      zType = 'z.number().int()';
      break;
    case 'float':
      zType = 'z.number()';
      break;
    case 'boolean':
      zType = 'z.boolean()';
      break;
    case 'any':
      zType = 'z.any()';
      break;
    case 'object':
      zType = field.objectEntity ? `${field.objectEntity.name}Schema` : 'z.record(z.any())';
      break;
    case 'array':
      if (field.arrayItemObject) {
        zType = `z.array(${field.arrayItemObject.name}Schema)`;
      } else if (field.arrayItemType === 'integer' || field.arrayItemType === 'float') {
        zType = 'z.array(z.number())';
      } else if (field.arrayItemType === 'boolean') {
        zType = 'z.array(z.boolean())';
      } else {
        zType = 'z.array(z.string())';
      }
      break;
  }

  if (field.isOptional) {
    zType += '.optional()';
  }
  return zType;
}

// 1. TypeScript Generator
const generatedTypeScript = computed(() => {
  const entity = parsedIr.value;
  if (!entity || entity.fields.length === 0) return '// No fields detected';

  const subEntities: IrEntity[] = [];
  function collectSubs(e: IrEntity) {
    for (const f of e.fields) {
      if (f.objectEntity) {
        collectSubs(f.objectEntity);
        subEntities.push(f.objectEntity);
      }
      if (f.arrayItemObject) {
        collectSubs(f.arrayItemObject);
        subEntities.push(f.arrayItemObject);
      }
    }
  }
  collectSubs(entity);

  let out = '';
  if (targetLang.value === 'typescript-both' || targetLang.value === 'typescript-zod') {
    out += `import { z } from 'zod';\n\n`;
  }

  // Render Sub-Entities first
  for (const sub of subEntities) {
    if (targetLang.value === 'typescript-both' || targetLang.value === 'typescript-interface') {
      out += `export interface ${sub.name} {\n`;
      for (const f of sub.fields) {
        const opt = f.isOptional ? '?' : '';
        out += `  ${f.name}${opt}: ${genTsType(f)};\n`;
      }
      out += `}\n\n`;
    }

    if (targetLang.value === 'typescript-both' || targetLang.value === 'typescript-zod') {
      const strictSuffix = strictMode.value ? '.strict()' : '';
      out += `export const ${sub.name}Schema = z.object({\n`;
      for (const f of sub.fields) {
        out += `  ${f.name}: ${genZodType(f)},\n`;
      }
      out += `})${strictSuffix};\n\n`;
    }
  }

  // Main Entity Interface
  if (targetLang.value === 'typescript-both' || targetLang.value === 'typescript-interface') {
    out += `export interface ${entity.name} {\n`;
    for (const f of entity.fields) {
      const opt = f.isOptional ? '?' : '';
      const comment = includeComments.value && f.comment ? ` // ${f.comment}` : '';
      out += `  ${f.name}${opt}: ${genTsType(f)};${comment}\n`;
    }
    out += `}\n\n`;
  }

  // Main Entity Zod
  if (targetLang.value === 'typescript-both' || targetLang.value === 'typescript-zod') {
    const strictSuffix = strictMode.value ? '.strict()' : '';
    out += `export const ${entity.name}Schema = z.object({\n`;
    for (const f of entity.fields) {
      out += `  ${f.name}: ${genZodType(f)},\n`;
    }
    out += `})${strictSuffix};\n\n`;
    out += `export type ${entity.name}Type = z.infer<typeof ${entity.name}Schema>;\n`;
  }

  return out.trim();
});

// 2. Go Struct Generator
const generatedGo = computed(() => {
  const entity = parsedIr.value;
  if (!entity || entity.fields.length === 0) return '// No fields detected';

  let hasTime = false;
  for (const f of entity.fields) {
    if (f.type === 'datetime') hasTime = true;
  }

  let out = `package models\n\n`;
  if (hasTime) {
    out += `import (\n\t"time"\n)\n\n`;
  }

  out += `type ${entity.name} struct {\n`;
  for (const f of entity.fields) {
    const goFieldName = toPascalCase(f.rawName);
    let goType = 'string';
    switch (f.type) {
      case 'integer':
        goType = f.isOptional ? '*int64' : 'int64';
        break;
      case 'float':
        goType = f.isOptional ? '*float64' : 'float64';
        break;
      case 'boolean':
        goType = f.isOptional ? '*bool' : 'bool';
        break;
      case 'datetime':
        goType = f.isOptional ? '*time.Time' : 'time.Time';
        break;
      case 'uuid':
      case 'string':
        goType = f.isOptional ? '*string' : 'string';
        break;
      case 'array':
        goType = '[]string';
        break;
      case 'object':
        goType = f.objectEntity ? f.objectEntity.name : 'map[string]interface{}';
        break;
      default:
        goType = 'interface{}';
    }

    const jsonTag = f.isOptional ? `${f.rawName},omitempty` : f.rawName;
    const dbTag = toSnakeCase(f.rawName);
    const comment = includeComments.value && f.comment ? ` // ${f.comment}` : '';
    out += `\t${goFieldName.padEnd(16)} ${goType.padEnd(16)} \`json:"${jsonTag}" db:"${dbTag}"\`${comment}\n`;
  }
  out += `}\n`;
  return out;
});

// 3. Rust Struct Generator
const generatedRust = computed(() => {
  const entity = parsedIr.value;
  if (!entity || entity.fields.length === 0) return '// No fields detected';

  let out = `use serde::{Deserialize, Serialize};\n\n`;
  out += `#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]\n`;
  out += `#[serde(rename_all = "camelCase")]\n`;
  out += `pub struct ${entity.name} {\n`;

  for (const f of entity.fields) {
    const rustFieldName = toSnakeCase(f.rawName);
    let rType = 'String';
    switch (f.type) {
      case 'integer':
        rType = 'i64';
        break;
      case 'float':
        rType = 'f64';
        break;
      case 'boolean':
        rType = 'bool';
        break;
      case 'datetime':
      case 'uuid':
      case 'string':
        rType = 'String';
        break;
      case 'array':
        rType = 'Vec<String>';
        break;
      case 'object':
        rType = f.objectEntity ? f.objectEntity.name : 'serde_json::Value';
        break;
      default:
        rType = 'serde_json::Value';
    }

    if (f.isOptional) {
      out += `    #[serde(skip_serializing_if = "Option::is_none")]\n`;
      rType = `Option<${rType}>`;
    }

    out += `    pub ${rustFieldName}: ${rType},\n`;
  }
  out += `}\n`;
  return out;
});

// 4. Python Pydantic v2 Generator
const generatedPython = computed(() => {
  const entity = parsedIr.value;
  if (!entity || entity.fields.length === 0) return '# No fields detected';

  let out = `from datetime import datetime\nfrom typing import List, Optional, Any\nfrom pydantic import BaseModel, ConfigDict, Field\n\n\n`;
  out += `class ${entity.name}(BaseModel):\n`;
  if (strictMode.value) {
    out += `    model_config = ConfigDict(strict=True)\n\n`;
  }

  for (const f of entity.fields) {
    const pyFieldName = toSnakeCase(f.rawName);
    let pyType = 'str';
    switch (f.type) {
      case 'integer':
        pyType = 'int';
        break;
      case 'float':
        pyType = 'float';
        break;
      case 'boolean':
        pyType = 'bool';
        break;
      case 'datetime':
        pyType = 'datetime';
        break;
      case 'uuid':
      case 'string':
        pyType = 'str';
        break;
      case 'array':
        pyType = 'List[str]';
        break;
      case 'object':
        pyType = f.objectEntity ? f.objectEntity.name : 'dict';
        break;
      default:
        pyType = 'Any';
    }

    const aliasPart = f.rawName !== pyFieldName ? `, alias="${f.rawName}"` : '';

    if (f.isOptional) {
      out += `    ${pyFieldName}: Optional[${pyType}] = Field(default=None${aliasPart})\n`;
    } else if (aliasPart) {
      out += `    ${pyFieldName}: ${pyType} = Field(...${aliasPart})\n`;
    } else {
      out += `    ${pyFieldName}: ${pyType}\n`;
    }
  }

  return out;
});

// Active Output
const generatedOutput = computed(() => {
  try {
    switch (targetLang.value) {
      case 'typescript-both':
      case 'typescript-interface':
      case 'typescript-zod':
        return generatedTypeScript.value;
      case 'go-struct':
        return generatedGo.value;
      case 'rust-struct':
        return generatedRust.value;
      case 'python-pydantic':
        return generatedPython.value;
      default:
        return generatedTypeScript.value;
    }
  } catch (err: any) {
    return `// Syntax error parsing source:\n// ${err?.message || err}`;
  }
});

// Clipboard
const copySuccess = ref(false);
function copyCode() {
  const text = generatedOutput.value;
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        copySuccess.value = true;
        setTimeout(() => {
          copySuccess.value = false;
        }, 2000);
      })
      .catch((err) => {
        console.warn('Clipboard copy failed, using fallback:', err);
        fallbackCopy(text);
      });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text: string) {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) {
      copySuccess.value = true;
      setTimeout(() => {
        copySuccess.value = false;
      }, 2000);
    } else {
      triggerToast(isEn.value ? 'Failed to copy to clipboard. Please copy manually.' : '复制失败，请手动选中文本复制。');
    }
  } catch (err) {
    console.error('Fallback copy failed:', err);
    triggerToast(isEn.value ? 'Failed to copy to clipboard. Please copy manually.' : '复制失败，请手动选中文本复制。');
  }
}

// Toast
const toastMessage = ref('');
const showToast = ref(false);

function triggerToast(msg: string) {
  toastMessage.value = msg;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 3500);
}

function handleAffiliateClick(url: string, platformName: string, ev: MouseEvent) {
  if (url.includes('PLACEHOLDER')) {
    ev.preventDefault();
    triggerToast(
      isEn.value
        ? `Official ${platformName} partner portal is updating. Redirecting to official site...`
        : `【${platformName}】专属优惠渠道系统维护中，正在为您打开官方安全通道...`
    );
    setTimeout(() => {
      window.open(`https://${platformName.toLowerCase().replace(/\s+/g, '')}.com`, '_blank');
    }, 1200);
  }
}
</script>

<template>
  <div class="polyglot-container">
    <!-- Clean Mode Developer Banner (when ref=v2ex or source=hn) -->
    <div v-if="isCleanMode" class="clean-mode-banner">
      <span class="clean-icon">🛠️</span>
      <span class="clean-text">
        {{
          isEn
            ? 'Pure Client-Side Engine · Zero Data Uploads · Core converter open-source on GitHub: iamyunsin'
            : '100% 纯客户端本地引擎 · 零隐私上传 · 核心代码开源于 GitHub: iamyunsin (已开启 V2EX/HN 极客纯净免干扰模式)'
        }}
      </span>
      <a
        href="https://github.com/iamyunsin"
        target="_blank"
        rel="noopener noreferrer"
        class="clean-gh-link"
      >
        GitHub ↗
      </a>
    </div>

    <!-- Green Privacy Shield Banner -->
    <div class="privacy-shield-banner">
      <div class="shield-badge">🔒 100% PURE CLIENT-SIDE</div>
      <div class="shield-text">
        <strong>
          {{
            isEn
              ? 'Zero Cloud Uploads · Safe for Production Schemas, API Keys & Secret DDLs'
              : '100% 浏览器本地离线解析 · 零网络上传 · 杜绝生产 API Key / 数据库 Schema 泄漏风险'
          }}
        </strong>
        <span class="f12-tip">
          {{
            isEn
              ? 'Verify anytime: Open F12 → Network tab. No HTTP requests are dispatched during conversion.'
              : '欢迎随时按下 F12 打开浏览器 Network 面板核验：代码转换全程在本地内存在线生成，无任何网络发包。'
          }}
        </span>
      </div>
    </div>

    <!-- Header -->
    <div class="tool-header">
      <h2 class="tool-title">
        {{ isEn ? 'Polyglot Type & Data Structure Forge' : '全栈多语言类型与数据结构转换工场' }}
      </h2>
      <p class="tool-subtitle">
        {{
          isEn
            ? 'Parse JSON, YAML, SQL DDL (CREATE TABLE), and cURL into modern TypeScript (Interface + Zod v3), Go Structs, Rust Serde, and Python Pydantic v2 in milliseconds.'
            : '毫秒级将 JSON、YAML、SQL DDL (CREATE TABLE) 及 cURL 网络请求逆向转为现代 TypeScript (Interface + Zod v3)、Go 结构体 (带 Tag)、Rust (Serde) 与 Python (Pydantic v2)。'
        }}
      </p>
    </div>

    <!-- Controls Row: Source Selector, Target Selector, Root Name & Flags -->
    <div class="controls-card">
      <div class="controls-top-row">
        <!-- Source Selector -->
        <div class="control-group">
          <label class="control-label">{{ isEn ? 'Source Format' : '输入源格式' }}</label>
          <div class="format-pill-group">
            <button
              v-for="s in (['json', 'yaml', 'sql-ddl', 'curl'] as SourceInputType[])"
              :key="s"
              type="button"
              class="pill-btn"
              :class="{ active: sourceType === s }"
              @click="sourceType = s"
            >
              {{ s.toUpperCase() }}
            </button>
          </div>
        </div>

        <!-- Target Selector -->
        <div class="control-group">
          <label class="control-label">{{ isEn ? 'Target Language' : '目标生成语言与模式' }}</label>
          <div class="format-pill-group">
            <button
              type="button"
              class="pill-btn"
              :class="{ active: targetLang === 'typescript-both' }"
              @click="targetLang = 'typescript-both'"
            >
              TS + Zod v3
            </button>
            <button
              type="button"
              class="pill-btn"
              :class="{ active: targetLang === 'typescript-interface' }"
              @click="targetLang = 'typescript-interface'"
            >
              TS Interface
            </button>
            <button
              type="button"
              class="pill-btn"
              :class="{ active: targetLang === 'go-struct' }"
              @click="targetLang = 'go-struct'"
            >
              Go Struct
            </button>
            <button
              type="button"
              class="pill-btn"
              :class="{ active: targetLang === 'rust-struct' }"
              @click="targetLang = 'rust-struct'"
            >
              Rust Serde
            </button>
            <button
              type="button"
              class="pill-btn"
              :class="{ active: targetLang === 'python-pydantic' }"
              @click="targetLang = 'python-pydantic'"
            >
              Pydantic v2
            </button>
          </div>
        </div>
      </div>

      <!-- Config Options Row -->
      <div class="controls-bottom-row">
        <div class="root-name-input-wrap">
          <label class="opt-label">{{ isEn ? 'Root Type Name:' : '根实体类型名称:' }}</label>
          <input
            v-model="rootTypeName"
            type="text"
            class="styled-root-input"
            placeholder="UserProfile"
          />
        </div>

        <div class="toggles-wrap">
          <label class="checkbox-label">
            <input v-model="camelCaseFields" type="checkbox" />
            <span>{{ isEn ? 'camelCase Fields' : '驼峰命名' }}</span>
          </label>
          <label class="checkbox-label">
            <input v-model="optionalFields" type="checkbox" />
            <span>{{ isEn ? 'All Optional' : '设为可选字段' }}</span>
          </label>
          <label class="checkbox-label">
            <input v-model="strictMode" type="checkbox" />
            <span>{{ isEn ? 'Strict Mode' : '严格模式 (Strict)' }}</span>
          </label>
          <label class="checkbox-label">
            <input v-model="includeComments" type="checkbox" />
            <span>{{ isEn ? 'Comments' : '保留约束注释' }}</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Dual Workspace Editor Panes -->
    <div class="editor-panes-grid">
      <!-- Input Code Editor -->
      <div class="editor-pane">
        <div class="pane-header">
          <span class="pane-title">
            📥 {{ isEn ? 'Source Input' : '输入源代码' }} ({{ sourceType.toUpperCase() }})
          </span>
          <button
            type="button"
            class="btn-reset-sample"
            @click="inputCode = sampleInputs[sourceType]"
          >
            ↺ {{ isEn ? 'Reset Sample' : '恢复示例' }}
          </button>
        </div>
        <textarea
          v-model="inputCode"
          class="code-textarea"
          rows="18"
          spellcheck="false"
        ></textarea>
      </div>

      <!-- Output Code Viewer -->
      <div class="editor-pane">
        <div class="pane-header">
          <span class="pane-title">
            📤 {{ isEn ? 'Generated Code' : '生成类型代码' }}
          </span>
          <button
            type="button"
            class="btn-copy-code"
            @click="copyCode"
          >
            {{ copySuccess ? (isEn ? '✓ Copied!' : '✓ 已复制到剪贴板!') : (isEn ? '📋 Copy Code' : '📋 复制生成代码') }}
          </button>
        </div>
        <textarea
          readonly
          class="code-textarea output-textarea"
          :value="generatedOutput"
          rows="18"
          spellcheck="false"
        ></textarea>
      </div>
    </div>

    <!-- Bottom Section: Monetization (Hidden in Clean Mode) or Tip Button -->
    <div v-if="!isCleanMode" class="dev-ecosystem-row">
      <!-- Cloud Server Partner -->
      <div class="eco-card">
        <div class="eco-badge">⚡ {{ isEn ? 'Developer Cloud' : '开发者算力推荐' }}</div>
        <h4 class="eco-title">{{ isEn ? 'High-Performance Cloud Servers' : '高性能轻量云主机' }}</h4>
        <p class="eco-desc">
          {{ isEn ? 'Deploy your generated microservices & APIs on high-speed low-cost cloud nodes:' : '将此类型生成的 Micro-API 极速部署至大带宽低延迟云主机：' }}
        </p>
        <div class="eco-links">
          <a
            href="https://cloud.tencent.com/act/cps/redirect?redirect=5333&cps_key=36215a0a94cd9bd656589c958fdee45b&from=console"
            target="_blank"
            rel="nofollow noopener sponsored"
            class="eco-link-btn"
          >
            {{ isEn ? 'Tencent Cloud Lighthouse (¥9/mo)' : '腾讯云轻量服务器 (¥9/月起) ↗' }}
          </a>
          <a
            href="https://cloud.siliconflow.cn/i/mxiALm95"
            target="_blank"
            rel="nofollow noopener sponsored"
            class="eco-link-btn"
          >
            {{ isEn ? 'SiliconFlow AI ($20M Token Coupon)' : '硅基流动 SiliconFlow 免费送 2000 万 Token ↗' }}
          </a>
        </div>
      </div>

      <!-- Tip & Coffee Box -->
      <div class="eco-card tip-card">
        <div class="eco-badge badge-coffee">☕ {{ isEn ? 'Support Free Tools' : '支持纯净免费工具' }}</div>
        <h4 class="eco-title">{{ isEn ? 'Buy Me a Coffee' : '请作者喝杯咖啡' }}</h4>
        <p class="eco-desc">
          {{
            isEn
              ? 'Enjoy zero tracking and local processing? Your support keeps this site ad-free and continuously maintained.'
              : '本工具坚持 100% 浏览器客户端零上传纯净设计。如果帮您节省了手动编写类型的时间，欢迎赞助一杯咖啡支持持续迭代！'
          }}
        </p>
        <div class="eco-links">
          <a
            :href="isEn ? 'https://buymeacoffee.com/PLACEHOLDER_COFFEE' : 'https://afdian.com/a/PLACEHOLDER_AFDIAN'"
            target="_blank"
            rel="nofollow noopener sponsored"
            class="btn-coffee"
            @click="handleAffiliateClick('PLACEHOLDER', 'BuyMeACoffee', $event)"
          >
            ☕ {{ isEn ? 'Buy Me a Coffee ($3)' : '爱发电 / 请喝咖啡 (¥9.9) ↗' }}
          </a>
        </div>
      </div>
    </div>

    <!-- Minimal Tip Button in Clean Mode -->
    <div v-else class="minimal-clean-footer">
      <a
        :href="isEn ? 'https://buymeacoffee.com/PLACEHOLDER_COFFEE' : 'https://afdian.com/a/PLACEHOLDER_AFDIAN'"
        target="_blank"
        rel="nofollow noopener sponsored"
        class="clean-coffee-btn"
        @click="handleAffiliateClick('PLACEHOLDER', 'BuyMeACoffee', $event)"
      >
        ☕ {{ isEn ? 'Buy author a coffee' : '如果觉得好用，请作者喝杯咖啡' }} ↗
      </a>
    </div>

    <!-- Toast Notification -->
    <transition name="toast-fade">
      <div v-if="showToast" class="toast-popup">
        <span class="toast-icon">ℹ️</span>
        <span class="toast-text">{{ toastMessage }}</span>
      </div>
    </transition>
  </div>
</template>

<style scoped lang="less">
.polyglot-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
}

/* Clean Mode Banner */
.clean-mode-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 12.5px;
  color: var(--text-primary);

  .clean-icon {
    font-size: 16px;
  }

  .clean-text {
    flex: 1;
    font-weight: 500;
  }

  .clean-gh-link {
    font-weight: 600;
    color: var(--accent);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

/* Privacy Green Shield */
.privacy-shield-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.28);
  border-radius: 12px;
  padding: 12px 16px;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
  }
}

.shield-badge {
  font-size: 11.5px;
  font-weight: 800;
  color: #ffffff;
  background: #059669;
  padding: 3px 8px;
  border-radius: 5px;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.shield-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 13px;
  color: var(--text-primary);

  strong {
    color: var(--text-primary);
  }

  .f12-tip {
    font-size: 12px;
    color: var(--text-muted);
    opacity: 0.95;
  }
}

/* Header */
.tool-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool-title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--text-primary);

  @media (max-width: 640px) {
    font-size: 16.5px;
  }
}

.tool-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* Controls */
.controls-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px 22px;
  box-shadow: var(--shadow-sm);

  @media (max-width: 640px) {
    padding: 16px 14px;
    border-radius: 12px;
  }
}

.controls-top-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.format-pill-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pill-btn {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  &.active {
    background: var(--accent);
    color: #ffffff;
    border-color: var(--accent);
    font-weight: 700;
  }
}

.controls-bottom-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border-subtle);
}

.root-name-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.opt-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);
}

.styled-root-input {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  transition: border-color 0.15s ease;

  &:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-soft);
    outline: none;
  }
}

.toggles-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;

  input {
    accent-color: var(--accent);
  }
}

/* Editor Panes Grid */
.editor-panes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.editor-pane {
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.pane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: var(--bg-muted);
  border-bottom: 1px solid var(--border-subtle);
}

.pane-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.btn-reset-sample {
  background: none;
  border: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;

  &:hover {
    color: var(--text-primary);
  }
}

.btn-copy-code {
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--accent);
    color: #ffffff;
  }
}

.code-textarea {
  width: 100%;
  padding: 16px 18px;
  border: none;
  background: var(--bg-surface);
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 13.5px;
  line-height: 1.6;
  resize: vertical;
  outline: none;

  &.output-textarea {
    background: var(--bg-surface-hover);
    color: var(--text-primary);
  }
}

/* Ecosystem / Monetization */
.dev-ecosystem-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.eco-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: var(--shadow-sm);

  &.tip-card {
    background: var(--bg-surface);
    border: 1px solid var(--accent-border);
  }
}

.eco-badge {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);

  &.badge-coffee {
    color: #d97706;
  }
}

.eco-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.eco-desc {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.eco-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
}

.eco-link-btn {
  display: block;
  padding: 8px 14px;
  border-radius: 8px;
  background: var(--bg-muted);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.15s ease;

  &:hover {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
  }
}

.btn-coffee {
  display: inline-block;
  align-self: flex-start;
  padding: 8px 16px;
  border-radius: 8px;
  background: #f59e0b;
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);
  transition: all 0.15s ease;

  &:hover {
    background: #d97706;
  }
}

.minimal-clean-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
}

.clean-coffee-btn {
  font-size: 12px;
  color: var(--text-muted);
  text-decoration: none;

  &:hover {
    color: #f59e0b;
    text-decoration: underline;
  }
}

/* Toast */
.toast-popup {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--bg-surface-elevated, #1e293b);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--shadow-md);
  z-index: 1000;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.25s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
