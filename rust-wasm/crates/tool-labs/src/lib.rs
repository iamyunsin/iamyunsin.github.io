//! Micro-Wasm Engine for Interactive Principle Visualizers (Labs):
//! 1. Vue 3 Template Compiler & PatchFlags / Block Tree Visualizer (`wasm_compile_vue_template`)
//! 2. JS Event Loop Step-by-Step State Machine (`wasm_simulate_event_loop`)
//! 3. Vue 3 Fast Diff (LIS Longest Increasing Subsequence) & Reactive Graph (`wasm_simulate_vue_diff`)
//! 4. HTTP/2 (TCP HoL Blocking) vs HTTP/3 (QUIC 0-RTT & Independent Streams) Simulator (`wasm_simulate_http3_quic`)

use shared_guard::{is_authorized_domain, perturbation_factor};
use std::alloc::{alloc, dealloc, Layout};
use std::slice;

static mut RESULT_PTR: *mut u8 = std::ptr::null_mut();
static mut RESULT_LEN: usize = 0;
static mut RESULT_CAP: usize = 0;

#[no_mangle]
pub extern "C" fn wasm_alloc(size: usize) -> *mut u8 {
    if size == 0 {
        return std::ptr::null_mut();
    }
    match Layout::from_size_align(size, 1) {
        Ok(l) => unsafe { alloc(l) },
        Err(_) => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub extern "C" fn wasm_dealloc(ptr: *mut u8, size: usize) {
    if ptr.is_null() || size == 0 {
        return;
    }
    if let Ok(layout) = Layout::from_size_align(size, 1) {
        unsafe { dealloc(ptr, layout) };
    }
}

#[no_mangle]
pub extern "C" fn wasm_result_ptr() -> *const u8 {
    unsafe { RESULT_PTR }
}

#[no_mangle]
pub extern "C" fn wasm_result_len() -> usize {
    unsafe { RESULT_LEN }
}

fn store_result(json: String) {
    unsafe {
        if !RESULT_PTR.is_null() && RESULT_CAP > 0 {
            if let Ok(layout) = Layout::from_size_align(RESULT_CAP, 1) {
                dealloc(RESULT_PTR, layout);
            }
        }
        let mut bytes = json.into_bytes();
        RESULT_LEN = bytes.len();
        RESULT_CAP = bytes.capacity();
        RESULT_PTR = bytes.as_mut_ptr();
        std::mem::forget(bytes);
    }
}

fn escape_json(s: &str, out: &mut String) {
    for ch in s.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c => out.push(c),
        }
    }
}

// ============================================================================
// 1. Vue 3 Template Compiler & PatchFlags / Block Tree Visualizer
// ============================================================================

#[derive(Clone, Debug)]
struct VueToken {
    kind: &'static str,
    raw: String,
    detail: String,
}

#[derive(Clone, Debug)]
struct VueAstNode {
    node_type: &'static str,
    tag: String,
    attrs: Vec<(String, String, bool)>, // (name, value, is_dynamic)
    interpolation: Option<String>,
    text: Option<String>,
    patch_flag: i32,
    patch_flag_names: Vec<&'static str>,
    dynamic_props: Vec<String>,
    is_block: bool,
    is_hoisted: bool,
    children: Vec<VueAstNode>,
}

fn describe_patch_flags(flag: i32) -> Vec<&'static str> {
    if flag == -1 {
        return vec!["HOISTED (-1)"];
    }
    let mut names = Vec::new();
    if (flag & 1) != 0 {
        names.push("TEXT (1)");
    }
    if (flag & 2) != 0 {
        names.push("CLASS (2)");
    }
    if (flag & 4) != 0 {
        names.push("STYLE (4)");
    }
    if (flag & 8) != 0 {
        names.push("PROPS (8)");
    }
    if (flag & 16) != 0 {
        names.push("FULL_PROPS (16)");
    }
    if (flag & 32) != 0 {
        names.push("NEED_HYDRATION (32)");
    }
    if (flag & 64) != 0 {
        names.push("STABLE_FRAGMENT (64)");
    }
    if (flag & 128) != 0 {
        names.push("KEYED_FRAGMENT (128)");
    }
    if (flag & 512) != 0 {
        names.push("NEED_PATCH (512)");
    }
    names
}

fn parse_attributes(attr_str: &str, tokens: &mut Vec<VueToken>) -> Vec<(String, String, bool)> {
    let mut attrs = Vec::new();
    let bytes = attr_str.as_bytes();
    let len = bytes.len();
    let mut i = 0;

    while i < len {
        while i < len && bytes[i].is_ascii_whitespace() {
            i += 1;
        }
        if i >= len {
            break;
        }
        let name_start = i;
        while i < len && !bytes[i].is_ascii_whitespace() && bytes[i] != b'=' {
            i += 1;
        }
        let name = attr_str[name_start..i].trim().to_string();
        if name.is_empty() {
            break;
        }
        while i < len && bytes[i].is_ascii_whitespace() {
            i += 1;
        }
        let mut val = String::new();
        if i < len && bytes[i] == b'=' {
            i += 1;
            while i < len && bytes[i].is_ascii_whitespace() {
                i += 1;
            }
            if i < len && (bytes[i] == b'"' || bytes[i] == b'\'') {
                let quote = bytes[i];
                i += 1;
                let val_start = i;
                while i < len && bytes[i] != quote {
                    i += 1;
                }
                val = attr_str[val_start..i].to_string();
                if i < len {
                    i += 1;
                }
            } else {
                let val_start = i;
                while i < len && !bytes[i].is_ascii_whitespace() {
                    i += 1;
                }
                val = attr_str[val_start..i].to_string();
            }
        }

        let is_dynamic = name.starts_with(':')
            || name.starts_with('@')
            || name.starts_with("v-");
        let kind = if is_dynamic { "Directive" } else { "Attribute" };
        let detail = if is_dynamic {
            format!("Dynamic directive `{}` = `{}`", name, val)
        } else {
            format!("Static attribute `{}` = \"{}\"", name, val)
        };
        tokens.push(VueToken {
            kind,
            raw: if val.is_empty() {
                name.clone()
            } else {
                format!("{}=\"{}\"", name, val)
            },
            detail,
        });
        attrs.push((name, val, is_dynamic));
    }
    attrs
}

fn parse_text_and_interpolations(
    raw: &str,
    tokens: &mut Vec<VueToken>,
    children: &mut Vec<VueAstNode>,
) -> bool {
    let mut has_interp = false;
    let mut rest = raw;

    while let Some(start) = rest.find("{{") {
        let before = &rest[..start];
        if !before.trim().is_empty() {
            let trimmed = before.trim().to_string();
            tokens.push(VueToken {
                kind: "Text",
                raw: trimmed.clone(),
                detail: "Static text literal".to_string(),
            });
            children.push(VueAstNode {
                node_type: "TextNode (2)",
                tag: "#text".to_string(),
                attrs: Vec::new(),
                interpolation: None,
                text: Some(trimmed),
                patch_flag: 0,
                patch_flag_names: Vec::new(),
                dynamic_props: Vec::new(),
                is_block: false,
                is_hoisted: true,
                children: Vec::new(),
            });
        }
        let after_open = &rest[start + 2..];
        if let Some(end) = after_open.find("}}") {
            let expr = after_open[..end].trim().to_string();
            has_interp = true;
            tokens.push(VueToken {
                kind: "Interpolation",
                raw: format!("{{{{ {} }}}}", expr),
                detail: format!("Reactive expression `_ctx.{}`", expr),
            });
            children.push(VueAstNode {
                node_type: "Interpolation (5)",
                tag: "{{}}".to_string(),
                attrs: Vec::new(),
                interpolation: Some(expr),
                text: None,
                patch_flag: 1,
                patch_flag_names: vec!["TEXT (1)"],
                dynamic_props: Vec::new(),
                is_block: false,
                is_hoisted: false,
                children: Vec::new(),
            });
            rest = &after_open[end + 2..];
        } else {
            break;
        }
    }

    if !rest.trim().is_empty() {
        let trimmed = rest.trim().to_string();
        tokens.push(VueToken {
            kind: "Text",
            raw: trimmed.clone(),
            detail: "Static text literal".to_string(),
        });
        children.push(VueAstNode {
            node_type: "TextNode (2)",
            tag: "#text".to_string(),
            attrs: Vec::new(),
            interpolation: None,
            text: Some(trimmed),
            patch_flag: 0,
            patch_flag_names: Vec::new(),
            dynamic_props: Vec::new(),
            is_block: false,
            is_hoisted: true,
            children: Vec::new(),
        });
    }

    has_interp
}

fn compute_element_flags(node: &mut VueAstNode) {
    let mut flag = 0i32;
    let mut dyn_props = Vec::new();
    let mut is_structural_block = false;

    for (name, _val, is_dyn) in &node.attrs {
        if !*is_dyn {
            continue;
        }
        if name == ":class" || name == "v-bind:class" {
            flag |= 2; // CLASS
        } else if name == ":style" || name == "v-bind:style" {
            flag |= 4; // STYLE
        } else if name == "v-if" || name == "v-else-if" || name == "v-else" {
            is_structural_block = true;
            flag |= 64; // STABLE_FRAGMENT / Block branch
        } else if name == "v-for" {
            is_structural_block = true;
            flag |= 128; // KEYED_FRAGMENT
        } else if name == "v-model" {
            flag |= 8; // PROPS
            dyn_props.push("modelValue".to_string());
        } else if let Some(stripped) = name.strip_prefix(':') {
            if stripped != "key" {
                flag |= 8; // PROPS
                dyn_props.push(stripped.to_string());
            }
        } else if let Some(stripped) = name.strip_prefix('@') {
            let ev_name = format!(
                "on{}{}",
                stripped.chars().next().unwrap_or('c').to_ascii_uppercase(),
                &stripped[stripped.chars().next().map(|c| c.len_utf8()).unwrap_or(0)..]
            );
            flag |= 8; // PROPS (or cached handler)
            dyn_props.push(ev_name);
        }
    }

    let has_interp_child = node.children.iter().any(|c| c.interpolation.is_some());
    if has_interp_child {
        flag |= 1; // TEXT
    }

    let any_child_dynamic = node
        .children
        .iter()
        .any(|c| c.patch_flag > 0 || c.is_block || !c.is_hoisted);

    if flag == 0 && !is_structural_block && !any_child_dynamic {
        node.patch_flag = -1;
        node.patch_flag_names = vec!["HOISTED (-1)"];
        node.is_hoisted = true;
        node.is_block = false;
    } else {
        node.patch_flag = flag;
        node.patch_flag_names = describe_patch_flags(flag);
        node.dynamic_props = dyn_props;
        node.is_block = is_structural_block;
        node.is_hoisted = false;
    }
}

fn serialize_ast_node(node: &VueAstNode, out: &mut String) {
    out.push_str("{\"nodeType\":\"");
    escape_json(node.node_type, out);
    out.push_str("\",\"tag\":\"");
    escape_json(&node.tag, out);
    out.push_str("\",\"patchFlag\":");
    out.push_str(&node.patch_flag.to_string());
    out.push_str(",\"isBlock\":");
    out.push_str(if node.is_block { "true" } else { "false" });
    out.push_str(",\"isHoisted\":");
    out.push_str(if node.is_hoisted { "true" } else { "false" });

    out.push_str(",\"patchFlagNames\":[");
    for (idx, name) in node.patch_flag_names.iter().enumerate() {
        if idx > 0 {
            out.push(',');
        }
        out.push('"');
        escape_json(name, out);
        out.push('"');
    }
    out.push(']');

    out.push_str(",\"dynamicProps\":[");
    for (idx, p) in node.dynamic_props.iter().enumerate() {
        if idx > 0 {
            out.push(',');
        }
        out.push('"');
        escape_json(p, out);
        out.push('"');
    }
    out.push(']');

    out.push_str(",\"attrs\":[");
    for (idx, (k, v, dyn_flag)) in node.attrs.iter().enumerate() {
        if idx > 0 {
            out.push(',');
        }
        out.push_str("{\"name\":\"");
        escape_json(k, out);
        out.push_str("\",\"value\":\"");
        escape_json(v, out);
        out.push_str("\",\"dynamic\":");
        out.push_str(if *dyn_flag { "true" } else { "false" });
        out.push('}');
    }
    out.push(']');

    if let Some(interp) = &node.interpolation {
        out.push_str(",\"interpolation\":\"");
        escape_json(interp, out);
        out.push('"');
    }
    if let Some(txt) = &node.text {
        out.push_str(",\"text\":\"");
        escape_json(txt, out);
        out.push('"');
    }

    out.push_str(",\"children\":[");
    for (idx, child) in node.children.iter().enumerate() {
        if idx > 0 {
            out.push(',');
        }
        serialize_ast_node(child, out);
    }
    out.push_str("]}");
}

pub fn compile_vue_template_internal(hostname: &str, template_raw: &str) -> String {
    let authorized = is_authorized_domain(hostname);
    let mut tokens: Vec<VueToken> = Vec::new();
    let mut stack: Vec<VueAstNode> = vec![VueAstNode {
        node_type: "Root (0)",
        tag: "ROOT".to_string(),
        attrs: Vec::new(),
        interpolation: None,
        text: None,
        patch_flag: 0,
        patch_flag_names: Vec::new(),
        dynamic_props: Vec::new(),
        is_block: true,
        is_hoisted: false,
        children: Vec::new(),
    }];

    // Strip outer <template>...</template> if present
    let trimmed = template_raw.trim();
    let inner = if let Some(s) = trimmed.strip_prefix("<template>") {
        s.strip_suffix("</template>").unwrap_or(s).trim()
    } else {
        trimmed
    };

    let mut cursor = 0usize;
    let bytes = inner.as_bytes();
    let len = bytes.len();

    while cursor < len {
        if let Some(rel_lt) = inner[cursor..].find('<') {
            let lt_pos = cursor + rel_lt;
            if lt_pos > cursor {
                let text_seg = &inner[cursor..lt_pos];
                if let Some(top) = stack.last_mut() {
                    parse_text_and_interpolations(text_seg, &mut tokens, &mut top.children);
                }
            }
            // Check comment
            if inner[lt_pos..].starts_with("<!--") {
                if let Some(end_c) = inner[lt_pos + 4..].find("-->") {
                    let comment_body = inner[lt_pos + 4..lt_pos + 4 + end_c].trim();
                    tokens.push(VueToken {
                        kind: "Comment",
                        raw: format!("<!-- {} -->", comment_body),
                        detail: "HTML comment node".to_string(),
                    });
                    cursor = lt_pos + 4 + end_c + 3;
                    continue;
                }
            }
            if let Some(rel_gt) = inner[lt_pos..].find('>') {
                let gt_pos = lt_pos + rel_gt;
                let tag_body = inner[lt_pos + 1..gt_pos].trim();

                if let Some(close_name) = tag_body.strip_prefix('/') {
                    let clean_close = close_name.trim().to_string();
                    tokens.push(VueToken {
                        kind: "TagClose",
                        raw: format!("</{}>", clean_close),
                        detail: format!("Close element `<{}>`", clean_close),
                    });
                    if stack.len() > 1 {
                        let mut finished = stack.pop().unwrap();
                        compute_element_flags(&mut finished);
                        if let Some(parent) = stack.last_mut() {
                            parent.children.push(finished);
                        }
                    }
                } else {
                    let self_closing = tag_body.ends_with('/')
                        || tag_body.starts_with("input")
                        || tag_body.starts_with("img")
                        || tag_body.starts_with("br")
                        || tag_body.starts_with("hr");
                    let clean_body = tag_body.strip_suffix('/').unwrap_or(tag_body).trim();
                    let mut parts = clean_body.splitn(2, char::is_whitespace);
                    let tag_name = parts.next().unwrap_or("div").trim().to_string();
                    let attr_part = parts.next().unwrap_or("");

                    tokens.push(VueToken {
                        kind: "TagOpen",
                        raw: format!("<{}>", tag_name),
                        detail: if tag_name
                            .chars()
                            .next()
                            .map(|c| c.is_ascii_uppercase())
                            .unwrap_or(false)
                        {
                            format!("Component VNode `<{}>`", tag_name)
                        } else {
                            format!("DOM Element `<{}>`", tag_name)
                        },
                    });

                    let parsed_attrs = parse_attributes(attr_part, &mut tokens);
                    let mut elem = VueAstNode {
                        node_type: if tag_name
                            .chars()
                            .next()
                            .map(|c| c.is_ascii_uppercase())
                            .unwrap_or(false)
                        {
                            "Component (1)"
                        } else {
                            "Element (1)"
                        },
                        tag: tag_name,
                        attrs: parsed_attrs,
                        interpolation: None,
                        text: None,
                        patch_flag: 0,
                        patch_flag_names: Vec::new(),
                        dynamic_props: Vec::new(),
                        is_block: false,
                        is_hoisted: false,
                        children: Vec::new(),
                    };

                    if self_closing {
                        compute_element_flags(&mut elem);
                        if let Some(parent) = stack.last_mut() {
                            parent.children.push(elem);
                        }
                    } else {
                        stack.push(elem);
                    }
                }
                cursor = gt_pos + 1;
            } else {
                break;
            }
        } else {
            let text_seg = &inner[cursor..];
            if let Some(top) = stack.last_mut() {
                parse_text_and_interpolations(text_seg, &mut tokens, &mut top.children);
            }
            break;
        }
    }

    while stack.len() > 1 {
        let mut finished = stack.pop().unwrap();
        compute_element_flags(&mut finished);
        if let Some(parent) = stack.last_mut() {
            parent.children.push(finished);
        }
    }

    let mut root = stack.pop().unwrap();
    if root.children.len() == 1 {
        root.children[0].is_block = true;
        root.children[0].is_hoisted = false;
    }

    // Collect hoisted nodes and dynamic block nodes, and generate authentic Vue 3 render code
    let mut hoisted_defs: Vec<String> = Vec::new();
    let mut block_nodes: Vec<String> = Vec::new();

    fn gen_codegen(
        node: &VueAstNode,
        indent: usize,
        hoisted_defs: &mut Vec<String>,
        block_nodes: &mut Vec<String>,
        is_root_child: bool,
    ) -> String {
        let pad = "  ".repeat(indent);
        if let Some(txt) = &node.text {
            return format!("{}\"{}\"", pad, txt.replace('"', "\\\""));
        }
        if let Some(interp) = &node.interpolation {
            return format!("{}_toDisplayString(_ctx.{})", pad, interp);
        }

        if node.is_hoisted && !is_root_child {
            let idx = hoisted_defs.len() + 1;
            let mut static_props = Vec::new();
            for (k, v, _) in &node.attrs {
                static_props.push(format!("{}: \"{}\"", k, v));
            }
            let props_obj = if static_props.is_empty() {
                "null".to_string()
            } else {
                format!("{{ {} }}", static_props.join(", "))
            };
            let text_child = node
                .children
                .first()
                .and_then(|c| c.text.as_ref())
                .map(|t| format!(", \"{}\"", t))
                .unwrap_or_default();
            hoisted_defs.push(format!(
                "const _hoisted_{} = /*#__PURE__*/_createElementVNode(\"{}\", {}{}, -1 /* HOISTED */)",
                idx, node.tag, props_obj, text_child
            ));
            return format!("{}_hoisted_{}", pad, idx);
        }

        if node.patch_flag > 0 || node.is_block {
            let flags_joined = if node.patch_flag_names.is_empty() {
                "BLOCK".to_string()
            } else {
                node.patch_flag_names.join(" | ")
            };
            block_nodes.push(format!("<{}> [{}]", node.tag, flags_joined));
        }

        let helper = if node.is_block || is_root_child {
            "_createElementBlock"
        } else {
            "_createElementVNode"
        };

        // Props object
        let mut props_parts = Vec::new();
        for (k, v, is_dyn) in &node.attrs {
            if !*is_dyn {
                props_parts.push(format!("{}: \"{}\"", k, v));
            } else if k == ":class" || k == "v-bind:class" {
                props_parts.push(format!("class: _normalizeClass(_ctx.{})", v));
            } else if k == ":style" || k == "v-bind:style" {
                props_parts.push(format!("style: _normalizeStyle(_ctx.{})", v));
            } else if let Some(p) = k.strip_prefix(':') {
                props_parts.push(format!("{}: _ctx.{}", p, v));
            } else if let Some(ev) = k.strip_prefix('@') {
                let ev_key = format!(
                    "on{}{}",
                    ev.chars().next().unwrap_or('c').to_ascii_uppercase(),
                    &ev[ev.chars().next().map(|c| c.len_utf8()).unwrap_or(0)..]
                );
                props_parts.push(format!(
                    "{}: _cache[0] || (_cache[0] = (...args) => (_ctx.{} && _ctx.{}(...args)))",
                    ev_key, v, v
                ));
            } else if k == "v-model" {
                props_parts.push(format!("modelValue: _ctx.{}", v));
                props_parts.push(format!(
                    "\"onUpdate:modelValue\": _cache[1] || (_cache[1] = $event => ((_ctx.{}) = $event))",
                    v
                ));
            }
        }
        let props_code = if props_parts.is_empty() {
            "null".to_string()
        } else {
            format!("{{ {} }}", props_parts.join(", "))
        };

        // Children code
        let children_code = if node.children.is_empty() {
            "null".to_string()
        } else if node.children.len() == 1
            && (node.children[0].text.is_some() || node.children[0].interpolation.is_some())
        {
            let c = &node.children[0];
            if let Some(interp) = &c.interpolation {
                format!("_toDisplayString(_ctx.{})", interp)
            } else if let Some(txt) = &c.text {
                format!("\"{}\"", txt)
            } else {
                "null".to_string()
            }
        } else if node.children.len() == 2
            && node
                .children
                .iter()
                .all(|c| c.text.is_some() || c.interpolation.is_some())
        {
            let parts: Vec<String> = node
                .children
                .iter()
                .map(|c| {
                    if let Some(interp) = &c.interpolation {
                        format!("_toDisplayString(_ctx.{})", interp)
                    } else {
                        format!("\"{} \"", c.text.as_deref().unwrap_or(""))
                    }
                })
                .collect();
            parts.join(" + ")
        } else {
            let mut arr = Vec::new();
            for child in &node.children {
                arr.push(gen_codegen(child, indent + 2, hoisted_defs, block_nodes, false));
            }
            format!("[\n{}\n{}  ]", arr.join(",\n"), pad)
        };

        let flag_comment = if node.patch_flag > 0 {
            let short_names: Vec<&str> = node
                .patch_flag_names
                .iter()
                .map(|n| n.split(' ').next().unwrap_or(n))
                .collect();
            if !node.dynamic_props.is_empty() {
                let quoted: Vec<String> =
                    node.dynamic_props.iter().map(|p| format!("\"{}\"", p)).collect();
                format!(
                    ", {} /* {} */, [{}]",
                    node.patch_flag,
                    short_names.join(", "),
                    quoted.join(", ")
                )
            } else {
                format!(", {} /* {} */", node.patch_flag, short_names.join(", "))
            }
        } else {
            String::new()
        };

        if node.is_block || is_root_child {
            format!(
                "{}(_openBlock(), {}(\"{}\", {}, {}{}))",
                pad, helper, node.tag, props_code, children_code, flag_comment
            )
        } else {
            format!(
                "{}{}(\"{}\", {}, {}{})",
                pad, helper, node.tag, props_code, children_code, flag_comment
            )
        }
    }

    let body_expr = if root.children.len() == 1 {
        gen_codegen(
            &root.children[0],
            2,
            &mut hoisted_defs,
            &mut block_nodes,
            true,
        )
    } else {
        let mut items = Vec::new();
        for c in &root.children {
            items.push(gen_codegen(c, 3, &mut hoisted_defs, &mut block_nodes, false));
        }
        format!(
            "  (_openBlock(), _createElementBlock(_Fragment, null, [\n{}\n  ], 64 /* STABLE_FRAGMENT */))",
            items.join(",\n")
        )
    };

    let hoisted_block = if hoisted_defs.is_empty() {
        "// (No static nodes eligible for hoisting)".to_string()
    } else {
        hoisted_defs.join("\n")
    };

    let render_code = format!(
        "import {{ createElementVNode as _createElementVNode, createElementBlock as _createElementBlock, openBlock as _openBlock, toDisplayString as _toDisplayString, normalizeClass as _normalizeClass, normalizeStyle as _normalizeStyle }} from \"vue\"\n\n{}\n\nexport function render(_ctx, _cache, $props, $setup) {{\n  return {}\n}}",
        hoisted_block,
        body_expr.trim_start()
    );

    let mut out = String::with_capacity(4096);
    out.push_str("{\"authorized\":");
    out.push_str(if authorized { "true" } else { "false" });
    out.push_str(",\"tokens\":[");
    for (idx, t) in tokens.iter().enumerate() {
        if idx > 0 {
            out.push(',');
        }
        out.push_str("{\"kind\":\"");
        escape_json(t.kind, &mut out);
        out.push_str("\",\"raw\":\"");
        escape_json(&t.raw, &mut out);
        out.push_str("\",\"detail\":\"");
        escape_json(&t.detail, &mut out);
        out.push_str("\"}");
    }
    out.push_str("],\"ast\":");
    serialize_ast_node(&root, &mut out);

    out.push_str(",\"hoistedCount\":");
    out.push_str(&hoisted_defs.len().to_string());
    out.push_str(",\"dynamicBlockNodes\":[");
    for (idx, b) in block_nodes.iter().enumerate() {
        if idx > 0 {
            out.push(',');
        }
        out.push('"');
        escape_json(b, &mut out);
        out.push('"');
    }
    out.push_str("],\"renderCode\":\"");
    escape_json(&render_code, &mut out);
    out.push_str("\"}");
    out
}

#[no_mangle]
pub extern "C" fn wasm_compile_vue_template(
    host_ptr: *const u8,
    host_len: usize,
    tpl_ptr: *const u8,
    tpl_len: usize,
) -> usize {
    let host = unsafe {
        std::str::from_utf8(slice::from_raw_parts(host_ptr, host_len)).unwrap_or("localhost")
    };
    let tpl =
        unsafe { std::str::from_utf8(slice::from_raw_parts(tpl_ptr, tpl_len)).unwrap_or("") };
    let json = compile_vue_template_internal(host, tpl);
    store_result(json);
    unsafe { RESULT_LEN }
}

// ============================================================================
// 2. Vue 3 Fast Diff (Longest Increasing Subsequence - LIS) & Reactive Engine
// ============================================================================

/// Authentic Vue 3 `getSequence(arr)` implementation returning indices of the
/// Longest Increasing Subsequence (O(n log n) greedy + binary search + predecessor chain).
pub fn vue3_get_sequence(arr: &[i32]) -> Vec<usize> {
    let mut p = arr.to_vec();
    let mut result: Vec<usize> = vec![0];
    let len = arr.len();

    for i in 0..len {
        let arr_i = arr[i];
        if arr_i != 0 {
            let j = *result.last().unwrap();
            if arr[j] < arr_i {
                p[i] = j as i32;
                result.push(i);
                continue;
            }
            let mut u = 0usize;
            let mut v = result.len() - 1;
            while u < v {
                let c = (u + v) >> 1;
                if arr[result[c]] < arr_i {
                    u = c + 1;
                } else {
                    v = c;
                }
            }
            if arr_i < arr[result[u]] {
                if u > 0 {
                    p[i] = result[u - 1] as i32;
                }
                result[u] = i;
            }
        }
    }

    let mut u = result.len();
    let mut v = *result.last().unwrap_or(&0) as i32;
    while u > 0 {
        u -= 1;
        result[u] = v as usize;
        v = p[v as usize];
    }
    result
}

pub fn simulate_vue_diff_internal(hostname: &str, old_csv: &str, new_csv: &str) -> String {
    let authorized = is_authorized_domain(hostname);
    let old_keys: Vec<String> = old_csv
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    let new_keys: Vec<String> = new_csv
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    let mut steps_json = Vec::new();
    let mut push_step = |stage: &str,
                         i_val: i32,
                         e1_val: i32,
                         e2_val: i32,
                         action: &str,
                         desc_zh: &str,
                         desc_en: &str,
                         dom_state: &[String]| {
        let mut s = String::new();
        s.push_str("{\"stage\":\"");
        escape_json(stage, &mut s);
        s.push_str("\",\"i\":");
        s.push_str(&i_val.to_string());
        s.push_str(",\"e1\":");
        s.push_str(&e1_val.to_string());
        s.push_str(",\"e2\":");
        s.push_str(&e2_val.to_string());
        s.push_str(",\"action\":\"");
        escape_json(action, &mut s);
        s.push_str("\",\"descZh\":\"");
        escape_json(desc_zh, &mut s);
        s.push_str("\",\"descEn\":\"");
        escape_json(desc_en, &mut s);
        s.push_str("\",\"domState\":[");
        for (idx, k) in dom_state.iter().enumerate() {
            if idx > 0 {
                s.push(',');
            }
            s.push('"');
            escape_json(k, &mut s);
            s.push('"');
        }
        s.push_str("]}");
        steps_json.push(s);
    };

    let mut dom = old_keys.clone();
    let mut i: i32 = 0;
    let mut e1: i32 = old_keys.len() as i32 - 1;
    let mut e2: i32 = new_keys.len() as i32 - 1;

    push_step(
        "0. Init",
        i,
        e1,
        e2,
        "init",
        "初始化双端指针 i = 0，旧队列尾指针 e1，新队列尾指针 e2。",
        "Initialize pointers: i = 0, old end pointer e1, new end pointer e2.",
        &dom,
    );

    // 1. Sync from start
    while i <= e1 && i <= e2 {
        let k1 = &old_keys[i as usize];
        let k2 = &new_keys[i as usize];
        if k1 == k2 {
            push_step(
                "1. Sync Start (头部同步)",
                i,
                e1,
                e2,
                "patch-same",
                &format!("头部节点 [{}] key 相同，原地复用 patch，指针 i 向右推进至 {}。", k1, i + 1),
                &format!("Head node [{}] matches; patch in-place and advance i to {}.", k1, i + 1),
                &dom,
            );
            i += 1;
        } else {
            push_step(
                "1. Sync Start (头部同步)",
                i,
                e1,
                e2,
                "break-start",
                &format!("头部遇到不同节点（旧 [{}] vs 新 [{}]），结束头部同步。", k1, k2),
                &format!("Head mismatch (old [{}] vs new [{}]); stop start-sync.", k1, k2),
                &dom,
            );
            break;
        }
    }

    // 2. Sync from end
    while i <= e1 && i <= e2 {
        let k1 = &old_keys[e1 as usize];
        let k2 = &new_keys[e2 as usize];
        if k1 == k2 {
            push_step(
                "2. Sync End (尾部同步)",
                i,
                e1,
                e2,
                "patch-same",
                &format!(
                    "尾部节点 [{}] key 相同，原地复用 patch，e1 左移至 {}，e2 左移至 {}。",
                    k1,
                    e1 - 1,
                    e2 - 1
                ),
                &format!(
                    "Tail node [{}] matches; patch in-place and decrement e1={}, e2={}.",
                    k1,
                    e1 - 1,
                    e2 - 1
                ),
                &dom,
            );
            e1 -= 1;
            e2 -= 1;
        } else {
            push_step(
                "2. Sync End (尾部同步)",
                i,
                e1,
                e2,
                "break-end",
                &format!("尾部遇到不同节点（旧 [{}] vs 新 [{}]），结束尾部同步。", k1, k2),
                &format!("Tail mismatch (old [{}] vs new [{}]); stop end-sync.", k1, k2),
                &dom,
            );
            break;
        }
    }

    let lis_indices: Vec<usize>;
    let mut lis_keys: Vec<String> = Vec::new();
    let mut new_idx_to_old_idx: Vec<i32> = Vec::new();
    let mut dom_moves = 0usize;
    let mut dom_mounts = 0usize;
    let mut dom_unmounts = 0usize;

    // 3. Common sequence + mount
    if i > e1 {
        if i <= e2 {
            for idx in i..=e2 {
                let k = &new_keys[idx as usize];
                let insert_pos = (idx as usize).min(dom.len());
                dom.insert(insert_pos, k.clone());
                dom_mounts += 1;
                push_step(
                    "3. Mount New (仅新增挂载)",
                    idx,
                    e1,
                    e2,
                    "mount",
                    &format!("i > e1 且 i <= e2：旧节点已遍历完，直接挂载新节点 [{}]。", k),
                    &format!("i > e1 && i <= e2: Old nodes exhausted; mount new node [{}].", k),
                    &dom,
                );
            }
        }
    } else if i > e2 {
        // 4. Common sequence + unmount
        for idx in i..=e1 {
            let k = &old_keys[idx as usize];
            dom.retain(|x| x != k);
            dom_unmounts += 1;
            push_step(
                "4. Unmount Old (仅卸载多余)",
                idx,
                e1,
                e2,
                "unmount",
                &format!("i > e2 且 i <= e1：新节点已遍历完，卸载多余旧节点 [{}]。", k),
                &format!("i > e2 && i <= e1: New nodes exhausted; unmount old node [{}].", k),
                &dom,
            );
        }
    } else {
        // 5. Unknown sequence (LIS Fast Diff)
        let s1 = i as usize;
        let s2 = i as usize;
        let to_be_patched = (e2 - i + 1) as usize;
        new_idx_to_old_idx = vec![0; to_be_patched];
        let mut moved = false;
        let mut max_new_index_so_far = 0usize;

        for old_idx in s1..=(e1 as usize) {
            let prev_key = &old_keys[old_idx];
            if let Some(rel_new) = new_keys[s2..=(e2 as usize)]
                .iter()
                .position(|k| k == prev_key)
            {
                let new_idx = s2 + rel_new;
                new_idx_to_old_idx[rel_new] = (old_idx + 1) as i32;
                if new_idx >= max_new_index_so_far {
                    max_new_index_so_far = new_idx;
                } else {
                    moved = true;
                }
            } else {
                dom.retain(|x| x != prev_key);
                dom_unmounts += 1;
                push_step(
                    "5.1 Prune Missing (清理乱序区被删节点)",
                    old_idx as i32,
                    e1,
                    e2,
                    "unmount",
                    &format!("乱序区间旧节点 [{}] 在新列表中不存在，执行 unmount 卸载。", prev_key),
                    &format!("Old node [{}] in unknown range is absent in new list; unmount.", prev_key),
                    &dom,
                );
            }
        }

        if moved || new_idx_to_old_idx.contains(&0) {
            lis_indices = if moved {
                vue3_get_sequence(&new_idx_to_old_idx)
            } else {
                (0..to_be_patched).collect()
            };

            for &seq_idx in &lis_indices {
                if s2 + seq_idx < new_keys.len() {
                    lis_keys.push(new_keys[s2 + seq_idx].clone());
                }
            }

            push_step(
                "5.2 Compute LIS (求解最长递增子序列)",
                i,
                e1,
                e2,
                "lis",
                &format!(
                    "构建 newIndexToOldIndexMap = {:?}，求出最长递增子序列锚点 {:?}（这些节点保持相对顺序不动，实现最小 DOM 移动）。",
                    new_idx_to_old_idx, lis_keys
                ),
                &format!(
                    "Built newIndexToOldIndexMap = {:?}; computed LIS stationary anchors {:?} to minimize DOM moves.",
                    new_idx_to_old_idx, lis_keys
                ),
                &dom,
            );

            let mut j = lis_indices.len() as i32 - 1;
            for k in (0..to_be_patched).rev() {
                let next_index = s2 + k;
                let next_key = &new_keys[next_index];
                if new_idx_to_old_idx[k] == 0 {
                    dom_mounts += 1;
                    // Update simulated DOM snapshot
                    dom.retain(|x| x != next_key);
                    let target_pos = next_index.min(dom.len());
                    dom.insert(target_pos, next_key.clone());
                    push_step(
                        "5.3 Reverse Patch & Move (倒序遍历与挂载/移动)",
                        next_index as i32,
                        e1,
                        e2,
                        "mount",
                        &format!(
                            "倒序检查位置 {}：节点 [{}] 的映射值为 0（全新节点），调用 patch(null, n2) 挂载插入。",
                            next_index, next_key
                        ),
                        &format!(
                            "Reverse step at {}: node [{}] has map value 0 (brand new); mount and insert.",
                            next_index, next_key
                        ),
                        &dom,
                    );
                } else if moved {
                    if j < 0 || k != lis_indices[j as usize] {
                        dom_moves += 1;
                        dom.retain(|x| x != next_key);
                        let target_pos = next_index.min(dom.len());
                        dom.insert(target_pos, next_key.clone());
                        push_step(
                            "5.3 Reverse Patch & Move (倒序遍历与挂载/移动)",
                            next_index as i32,
                            e1,
                            e2,
                            "move",
                            &format!(
                                "倒序检查位置 {}：节点 [{}] 不在最长递增子序列 LIS 中，调用 hostInsert 移动至正确锚点前。",
                                next_index, next_key
                            ),
                            &format!(
                                "Reverse step at {}: node [{}] is not in LIS; execute hostInsert move.",
                                next_index, next_key
                            ),
                            &dom,
                        );
                    } else {
                        push_step(
                            "5.3 Reverse Patch & Move (倒序遍历与挂载/移动)",
                            next_index as i32,
                            e1,
                            e2,
                            "stay-lis",
                            &format!(
                                "倒序检查位置 {}：节点 [{}] 命中 LIS 最长递增子序列锚点，无需移动 DOM！指针 j 递减。",
                                next_index, next_key
                            ),
                            &format!(
                                "Reverse step at {}: node [{}] hits LIS stationary anchor; zero DOM move needed!",
                                next_index, next_key
                            ),
                            &dom,
                        );
                        j -= 1;
                    }
                }
            }
        }
    }

    // Ensure final DOM matches new_keys
    dom = new_keys.clone();
    push_step(
        "6. Complete (Diff 完成)",
        i,
        e1,
        e2,
        "done",
        &format!(
            "快速 Diff 完成！共发生 {} 次移动、{} 次新增挂载、{} 次卸载，DOM 已与新 VNode 树完全同步。",
            dom_moves, dom_mounts, dom_unmounts
        ),
        &format!(
            "Fast Diff complete! Total: {} moves, {} mounts, {} unmounts.",
            dom_moves, dom_mounts, dom_unmounts
        ),
        &dom,
    );

    let mut out = String::with_capacity(4096);
    out.push_str("{\"authorized\":");
    out.push_str(if authorized { "true" } else { "false" });
    out.push_str(",\"newIdxToOldIdx\":[");
    for (idx, val) in new_idx_to_old_idx.iter().enumerate() {
        if idx > 0 {
            out.push(',');
        }
        out.push_str(&val.to_string());
    }
    out.push_str("],\"lisKeys\":[");
    for (idx, k) in lis_keys.iter().enumerate() {
        if idx > 0 {
            out.push(',');
        }
        out.push('"');
        escape_json(k, &mut out);
        out.push('"');
    }
    out.push_str("],\"stats\":{\"moves\":");
    out.push_str(&dom_moves.to_string());
    out.push_str(",\"mounts\":");
    out.push_str(&dom_mounts.to_string());
    out.push_str(",\"unmounts\":");
    out.push_str(&dom_unmounts.to_string());
    out.push_str("},\"steps\":[");
    for (idx, st) in steps_json.iter().enumerate() {
        if idx > 0 {
            out.push(',');
        }
        out.push_str(st);
    }
    out.push_str("]}");
    out
}

#[no_mangle]
pub extern "C" fn wasm_simulate_vue_diff(
    host_ptr: *const u8,
    host_len: usize,
    old_ptr: *const u8,
    old_len: usize,
    new_ptr: *const u8,
    new_len: usize,
) -> usize {
    let host = unsafe {
        std::str::from_utf8(slice::from_raw_parts(host_ptr, host_len)).unwrap_or("localhost")
    };
    let old_csv =
        unsafe { std::str::from_utf8(slice::from_raw_parts(old_ptr, old_len)).unwrap_or("") };
    let new_csv =
        unsafe { std::str::from_utf8(slice::from_raw_parts(new_ptr, new_len)).unwrap_or("") };
    let json = simulate_vue_diff_internal(host, old_csv, new_csv);
    store_result(json);
    unsafe { RESULT_LEN }
}

// ============================================================================
// 3. HTTP/2 (TCP + TLS) vs HTTP/3 (QUIC 0-RTT & Independent Streams) Simulator
// ============================================================================

pub fn simulate_http3_quic_internal(
    hostname: &str,
    rtt_ms: u32,
    loss_pct: u32,
    zero_rtt: bool,
) -> String {
    let factor = perturbation_factor(hostname);
    let rtt = (rtt_ms.clamp(10, 500) as f64 * factor).round() as u32;
    let loss = loss_pct.clamp(0, 30);

    // Handshake cost
    // HTTP/2 over TCP + TLS 1.3: 1 RTT (TCP SYN/SYN-ACK) + 1 RTT (TLS 1.3 ClientHello/ServerHello) = 2 RTT
    let h2_handshake_ms = rtt * 2;
    // HTTP/3 over QUIC: 0-RTT if session resumed, else 1-RTT
    let h3_handshake_ms = if zero_rtt { 0 } else { rtt };

    // Base transmission duration for 4 parallel resource streams (app.js, vendor.js, style.css, hero.webp)
    // Stream 0 (app.js) experiences packet loss if loss > 0.
    // In HTTP/2, TCP Head-of-Line (HoL) blocking freezes ALL 4 streams for (1.5 * RTT * ceil(loss/3)) while waiting for TCP retransmission!
    // In HTTP/3, QUIC streams are independent at the UDP transport layer: ONLY Stream 0 pays retransmission RTT; Streams 1, 2, 3 complete unblocked!
    let retransmit_rounds = if loss == 0 {
        0
    } else if loss <= 3 {
        1
    } else if loss <= 10 {
        2
    } else {
        3
    };
    let retransmit_penalty_ms = retransmit_rounds * rtt;

    let base_transfer = [rtt, (rtt * 4) / 5, (rtt * 3) / 5, rtt + 15];
    let stream_names = [
        "Stream #1: app.bundle.js (120 KB)",
        "Stream #2: style.css (38 KB)",
        "Stream #3: hero-banner.webp (85 KB)",
        "Stream #4: /api/init.json (12 KB)",
    ];

    let mut h2_streams = Vec::new();
    let mut h3_streams = Vec::new();
    let mut h2_max_total = 0u32;
    let mut h3_max_total = 0u32;

    for idx in 0..4 {
        let base_t = base_transfer[idx];
        // In HTTP/2, if any packet drops, TCP kernel buffer holds back delivery of all subsequent multiplexed frames
        let h2_hol_blocked = if loss > 0 { retransmit_penalty_ms } else { 0 };
        let h2_total = h2_handshake_ms + base_t + h2_hol_blocked;
        if h2_total > h2_max_total {
            h2_max_total = h2_total;
        }

        // In HTTP/3, only Stream #1 (idx == 0) experiences packet loss retransmission; Streams #2, #3, #4 suffer 0 HoL blocking!
        let h3_retransmit = if idx == 0 && loss > 0 {
            retransmit_penalty_ms
        } else {
            0
        };
        let h3_total = h3_handshake_ms + base_t + h3_retransmit;
        if h3_total > h3_max_total {
            h3_max_total = h3_total;
        }

        h2_streams.push(format!(
            "{{\"name\":\"{}\",\"handshakeMs\":{},\"transferMs\":{},\"holBlockedMs\":{},\"totalMs\":{}}}",
            stream_names[idx], h2_handshake_ms, base_t, h2_hol_blocked, h2_total
        ));
        h3_streams.push(format!(
            "{{\"name\":\"{}\",\"handshakeMs\":{},\"transferMs\":{},\"holBlockedMs\":{},\"totalMs\":{}}}",
            stream_names[idx], h3_handshake_ms, base_t, h3_retransmit, h3_total
        ));
    }

    let saved_ms = h2_max_total.saturating_sub(h3_max_total);
    let speedup_pct = if h2_max_total > 0 {
        ((saved_ms as f64 / h2_max_total as f64) * 100.0).round() as u32
    } else {
        0
    };

    format!(
        "{{\"rttMs\":{},\"lossPct\":{},\"zeroRtt\":{},\"h2HandshakeMs\":{},\"h3HandshakeMs\":{},\"h2TotalMs\":{},\"h3TotalMs\":{},\"savedMs\":{},\"speedupPct\":{},\"h2Streams\":[{}],\"h3Streams\":[{}]}}",
        rtt,
        loss,
        if zero_rtt { "true" } else { "false" },
        h2_handshake_ms,
        h3_handshake_ms,
        h2_max_total,
        h3_max_total,
        saved_ms,
        speedup_pct,
        h2_streams.join(","),
        h3_streams.join(",")
    )
}

#[no_mangle]
pub extern "C" fn wasm_simulate_http3_quic(
    host_ptr: *const u8,
    host_len: usize,
    rtt_ms: u32,
    loss_pct: u32,
    zero_rtt: u32,
) -> usize {
    let host = unsafe {
        std::str::from_utf8(slice::from_raw_parts(host_ptr, host_len)).unwrap_or("localhost")
    };
    let json = simulate_http3_quic_internal(host, rtt_ms, loss_pct, zero_rtt != 0);
    store_result(json);
    unsafe { RESULT_LEN }
}

// ============================================================================
// 4. JS Event Loop Step-by-Step State Machine (`wasm_simulate_event_loop`)
// ============================================================================

struct LoopFrame<'a> {
    line: u32,
    phase: &'a str,
    stationmaster_zh: &'a str,
    stationmaster_en: &'a str,
    call_stack: &'a [&'a str],
    micro_queue: &'a [&'a str],
    raf_queue: &'a [&'a str],
    macro_queue: &'a [&'a str],
    idle_queue: &'a [&'a str],
    logs: &'a [&'a str],
    desc_zh: &'a str,
    desc_en: &'a str,
}

pub fn simulate_event_loop_internal(hostname: &str, scenario_id: u32) -> String {
    let authorized = is_authorized_domain(hostname);

    let frames: Vec<LoopFrame> = match scenario_id {
        1 => vec![
            LoopFrame {
                line: 1,
                phase: "sync",
                stationmaster_zh: "处理日常事务（执行主线程同步代码）",
                stationmaster_en: "Executing Call Stack (Synchronous Script)",
                call_stack: &["<script>", "console.log('1. Sync Start')"],
                micro_queue: &[],
                raf_queue: &[],
                macro_queue: &[],
                idle_queue: &[],
                logs: &["1. Sync Start"],
                desc_zh: "主线程同步代码入栈执行，立即打印 '1. Sync Start'。",
                desc_en: "Main thread script enters Call Stack and logs '1. Sync Start'.",
            },
            LoopFrame {
                line: 2,
                phase: "sync",
                stationmaster_zh: "处理日常事务（注册 setTimeout 宏任务）",
                stationmaster_en: "Scheduling Macrotask (setTimeout)",
                call_stack: &["<script>", "setTimeout(cb_T1, 0)"],
                micro_queue: &[],
                raf_queue: &[],
                macro_queue: &["cb_T1 (setTimeout 0ms)"],
                idle_queue: &[],
                logs: &["1. Sync Start"],
                desc_zh: "调用 setTimeout(..., 0)，Timer 线程将回调 cb_T1 排入【宏任务队列】。",
                desc_en: "setTimeout schedules cb_T1 into the Macrotask Queue.",
            },
            LoopFrame {
                line: 5,
                phase: "sync",
                stationmaster_zh: "处理日常事务（注册第一个 Promise 微任务）",
                stationmaster_en: "Scheduling Microtask #1 (Promise.then)",
                call_stack: &["<script>", "Promise.resolve().then(cb_M1)"],
                micro_queue: &["cb_M1 (Promise #1)"],
                raf_queue: &[],
                macro_queue: &["cb_T1 (setTimeout 0ms)"],
                idle_queue: &[],
                logs: &["1. Sync Start"],
                desc_zh: "Promise.resolve().then 将 cb_M1 放入【微任务队列】。",
                desc_en: "Promise.resolve().then enqueues cb_M1 into the Microtask Queue.",
            },
            LoopFrame {
                line: 12,
                phase: "sync",
                stationmaster_zh: "处理日常事务（同步栈即将清空）",
                stationmaster_en: "Finishing Synchronous Script",
                call_stack: &["<script>", "console.log('2. Sync End')"],
                micro_queue: &["cb_M1 (Promise #1)"],
                raf_queue: &[],
                macro_queue: &["cb_T1 (setTimeout 0ms)"],
                idle_queue: &[],
                logs: &["1. Sync Start", "2. Sync End"],
                desc_zh: "打印 '2. Sync End'，随后主线程同步执行栈清空，站长立即检查【微任务队列】。",
                desc_en: "Logs '2. Sync End'. Call Stack is now empty; checking Microtask Queue next.",
            },
            LoopFrame {
                line: 6,
                phase: "microtask",
                stationmaster_zh: "接特快列车（执行微任务 cb_M1 并衍生新微任务 cb_M2）",
                stationmaster_en: "Draining Microtask Queue (cb_M1 spawns cb_M2)",
                call_stack: &["cb_M1", "Promise.resolve().then(cb_M2)"],
                micro_queue: &["cb_M2 (Spawned inside M1)"],
                raf_queue: &[],
                macro_queue: &["cb_T1 (setTimeout 0ms)"],
                idle_queue: &[],
                logs: &["1. Sync Start", "2. Sync End", "3. Microtask M1"],
                desc_zh: "执行微任务 cb_M1 打印 '3. Microtask M1'，并在内部继续注册新微任务 cb_M2！注意：本轮微任务必须全部清空才会去接宏任务。",
                desc_en: "cb_M1 logs '3. Microtask M1' and enqueues cb_M2. All microtasks must drain before any macrotask runs!",
            },
            LoopFrame {
                line: 8,
                phase: "microtask",
                stationmaster_zh: "接特快列车（连续清空衍生微任务 cb_M2）",
                stationmaster_en: "Executing Newly Spawned Microtask cb_M2",
                call_stack: &["cb_M2", "console.log('4. Nested Microtask M2')"],
                micro_queue: &[],
                raf_queue: &[],
                macro_queue: &["cb_T1 (setTimeout 0ms)"],
                idle_queue: &[],
                logs: &[
                    "1. Sync Start",
                    "2. Sync End",
                    "3. Microtask M1",
                    "4. Nested Microtask M2",
                ],
                desc_zh: "微任务队列中的衍生任务 cb_M2 立即在本轮被执行，打印 '4. Nested Microtask M2'。至此微任务队列彻底清空。",
                desc_en: "Nested microtask cb_M2 runs immediately in the same tick. Microtask Queue is now empty.",
            },
            LoopFrame {
                line: 3,
                phase: "macrotask",
                stationmaster_zh: "接普通列车（从宏任务队列队头取出 cb_T1）",
                stationmaster_en: "Dequeueing Macrotask cb_T1",
                call_stack: &["cb_T1 (setTimeout)", "console.log('5. Macrotask T1')"],
                micro_queue: &[],
                raf_queue: &[],
                macro_queue: &[],
                idle_queue: &[],
                logs: &[
                    "1. Sync Start",
                    "2. Sync End",
                    "3. Microtask M1",
                    "4. Nested Microtask M2",
                    "5. Macrotask T1",
                ],
                desc_zh: "微任务清空后，站长从宏任务队列取出 cb_T1 放入执行栈，打印 '5. Macrotask T1'。",
                desc_en: "With microtasks drained, stationmaster dequeues macrotask cb_T1 and logs '5. Macrotask T1'.",
            },
        ],
        2 => vec![
            LoopFrame {
                line: 2,
                phase: "sync",
                stationmaster_zh: "处理日常事务（调用 async 函数前半段同步代码）",
                stationmaster_en: "Entering async1() synchronously before await",
                call_stack: &["<script>", "async1()", "console.log('1. async1 start')"],
                micro_queue: &[],
                raf_queue: &[],
                macro_queue: &[],
                idle_queue: &[],
                logs: &["1. async1 start"],
                desc_zh: "调用 async1()，遇到 await 之前的代码完全同步执行，打印 '1. async1 start'。",
                desc_en: "Code inside async1() before `await` runs synchronously, logging '1. async1 start'.",
            },
            LoopFrame {
                line: 3,
                phase: "sync",
                stationmaster_zh: "处理日常事务（执行 await 右侧表达式并挂起后续代码）",
                stationmaster_en: "Evaluating await expression & suspending continuation",
                call_stack: &["<script>", "async1()", "async2()"],
                micro_queue: &["async1_continuation (after await)"],
                raf_queue: &[],
                macro_queue: &[],
                idle_queue: &[],
                logs: &["1. async1 start", "2. async2"],
                desc_zh: "同步执行 async2() 打印 '2. async2'；随后遇到 await，将 await 后面的代码包装为微任务放入【微任务队列】，让出执行栈！",
                desc_en: "async2() runs synchronously ('2. async2'); `await` suspends async1 and enqueues its continuation into the Microtask Queue.",
            },
            LoopFrame {
                line: 10,
                phase: "sync",
                stationmaster_zh: "处理日常事务（继续执行脚本剩余同步代码）",
                stationmaster_en: "Continuing Main Script Execution",
                call_stack: &["<script>", "console.log('3. script end')"],
                micro_queue: &["async1_continuation (after await)"],
                raf_queue: &[],
                macro_queue: &["setTimeout_cb"],
                idle_queue: &[],
                logs: &["1. async1 start", "2. async2", "3. script end"],
                desc_zh: "注册 setTimeout 宏任务后，主脚本打印 '3. script end'，同步执行栈清空。",
                desc_en: "After scheduling setTimeout, main script logs '3. script end' and Call Stack clears.",
            },
            LoopFrame {
                line: 4,
                phase: "microtask",
                stationmaster_zh: "接特快列车（恢复执行 await 之后的微任务）",
                stationmaster_en: "Resuming async1 continuation from Microtask Queue",
                call_stack: &["async1_continuation", "console.log('4. async1 end')"],
                micro_queue: &[],
                raf_queue: &[],
                macro_queue: &["setTimeout_cb"],
                idle_queue: &[],
                logs: &[
                    "1. async1 start",
                    "2. async2",
                    "3. script end",
                    "4. async1 end",
                ],
                desc_zh: "执行栈清空后立即消费微任务队列，恢复执行 await 之后的语句，打印 '4. async1 end'。",
                desc_en: "Microtask Queue runs async1's resumed continuation, logging '4. async1 end'.",
            },
            LoopFrame {
                line: 8,
                phase: "macrotask",
                stationmaster_zh: "接普通列车（执行 setTimeout 宏任务）",
                stationmaster_en: "Executing setTimeout Macrotask",
                call_stack: &["setTimeout_cb", "console.log('5. setTimeout')"],
                micro_queue: &[],
                raf_queue: &[],
                macro_queue: &[],
                idle_queue: &[],
                logs: &[
                    "1. async1 start",
                    "2. async2",
                    "3. script end",
                    "4. async1 end",
                    "5. setTimeout",
                ],
                desc_zh: "微任务全部清空，取出宏任务队列中的 setTimeout 回调执行，打印 '5. setTimeout'。",
                desc_en: "Finally, setTimeout macrotask executes and logs '5. setTimeout'.",
            },
        ],
        _ => vec![
            // Default Scenario 0: The exact `slowAction()` from Yunsin's blog post 《一文讲透事件循环》
            LoopFrame {
                line: 2,
                phase: "sync",
                stationmaster_zh: "处理日常事务（光杆站长开始执行 slowAction）",
                stationmaster_en: "Stationmaster Busy: Executing slowAction() on Call Stack",
                call_stack: &["slowAction()", "console.log('执行栈：慢操作执行开始')"],
                micro_queue: &[],
                raf_queue: &[],
                macro_queue: &[],
                idle_queue: &[],
                logs: &["执行栈：慢操作执行开始"],
                desc_zh: "《一文讲透事件循环》经典案例启动：站长进入工作状态，执行栈压入 slowAction()，首先输出 '执行栈：慢操作执行开始'。",
                desc_en: "Stationmaster starts `slowAction()` on the Call Stack, logging '执行栈：慢操作执行开始'.",
            },
            LoopFrame {
                line: 3,
                phase: "sync",
                stationmaster_zh: "处理日常事务（登记 requestIdleCallback 空闲回调）",
                stationmaster_en: "Registering requestIdleCallback",
                call_stack: &["slowAction()", "requestIdleCallback(cb_idle)"],
                micro_queue: &[],
                raf_queue: &[],
                macro_queue: &[],
                idle_queue: &["cb_idle (requestIdleCallback)"],
                logs: &["执行栈：慢操作执行开始"],
                desc_zh: "注册 requestIdleCallback：注意它不会抢占当前工作，仅在站长彻底处理完微任务、重绘与宏任务且仍有空余帧时间时才触发。",
                desc_en: "Registers requestIdleCallback into the Idle Queue (only runs when frame has idle time left).",
            },
            LoopFrame {
                line: 6,
                phase: "sync",
                stationmaster_zh: "处理日常事务（登记 setTimeout 0ms 宏任务）",
                stationmaster_en: "Enqueuing setTimeout(0) into Macrotask Queue",
                call_stack: &["slowAction()", "setTimeout(cb_timeout, 0)"],
                micro_queue: &[],
                raf_queue: &[],
                macro_queue: &["cb_timeout (setTimeout 0ms)"],
                idle_queue: &["cb_idle (requestIdleCallback)"],
                logs: &["执行栈：慢操作执行开始"],
                desc_zh: "调用 setTimeout(..., 0)：定时器到期后将 cb_timeout 放入【宏任务队列】排队等候。",
                desc_en: "setTimeout(0) places `cb_timeout` into the Macrotask Queue.",
            },
            LoopFrame {
                line: 9,
                phase: "sync",
                stationmaster_zh: "处理日常事务（登记 requestAnimationFrame 渲染前回调）",
                stationmaster_en: "Registering requestAnimationFrame Callback",
                call_stack: &["slowAction()", "requestAnimationFrame(cb_rAF)"],
                micro_queue: &[],
                raf_queue: &["cb_rAF (requestAnimationFrame)"],
                macro_queue: &["cb_timeout (setTimeout 0ms)"],
                idle_queue: &["cb_idle (requestIdleCallback)"],
                logs: &["执行栈：慢操作执行开始"],
                desc_zh: "调用 requestAnimationFrame：将 cb_rAF 放入渲染帧队列（在下一次浏览器 UI 重绘前执行）。",
                desc_en: "requestAnimationFrame registers `cb_rAF` to run right before the next browser repaint.",
            },
            LoopFrame {
                line: 12,
                phase: "sync",
                stationmaster_zh: "处理日常事务（登记 Promise.then 特快微任务）",
                stationmaster_en: "Enqueuing Promise.then into Microtask Queue",
                call_stack: &["slowAction()", "Promise.resolve().then(cb_promise)"],
                micro_queue: &["cb_promise (Promise.then)"],
                raf_queue: &["cb_rAF (requestAnimationFrame)"],
                macro_queue: &["cb_timeout (setTimeout 0ms)"],
                idle_queue: &["cb_idle (requestIdleCallback)"],
                logs: &["执行栈：慢操作执行开始"],
                desc_zh: "调用 Promise.resolve().then：将 cb_promise 放入最高优先级的【微任务队列】。",
                desc_en: "Promise.resolve().then enqueues `cb_promise` into the high-priority Microtask Queue.",
            },
            LoopFrame {
                line: 16,
                phase: "sync",
                stationmaster_zh: "处理日常事务（同步耗时循环完成，主脚本出栈）",
                stationmaster_en: "Finishing Synchronous Loop & Clearing Call Stack",
                call_stack: &["slowAction()", "console.log('执行栈：慢操作执行结束')"],
                micro_queue: &["cb_promise (Promise.then)"],
                raf_queue: &["cb_rAF (requestAnimationFrame)"],
                macro_queue: &["cb_timeout (setTimeout 0ms)"],
                idle_queue: &["cb_idle (requestIdleCallback)"],
                logs: &["执行栈：慢操作执行开始", "执行栈：慢操作执行结束"],
                desc_zh: "耗时同步循环跑完，打印 '执行栈：慢操作执行结束'。至此【执行栈】终于清空，站长立即按照优先级检查队列！",
                desc_en: "Synchronous loop finishes and logs '执行栈：慢操作执行结束'. Call Stack is now empty!",
            },
            LoopFrame {
                line: 13,
                phase: "microtask",
                stationmaster_zh: "第一步检查微任务队列（优先接特快列车 Promise）",
                stationmaster_en: "Step 1: Drain Microtask Queue (Promise.then)",
                call_stack: &["cb_promise", "console.log('执行栈：Promise')"],
                micro_queue: &[],
                raf_queue: &["cb_rAF (requestAnimationFrame)"],
                macro_queue: &["cb_timeout (setTimeout 0ms)"],
                idle_queue: &["cb_idle (requestIdleCallback)"],
                logs: &[
                    "执行栈：慢操作执行开始",
                    "执行栈：慢操作执行结束",
                    "执行栈：Promise",
                ],
                desc_zh: "执行栈一清空，必先清空【微任务队列】！取出 cb_promise 入栈执行，打印 '执行栈：Promise'。",
                desc_en: "Microtask Queue always drains first after Call Stack clears: logs '执行栈：Promise'.",
            },
            LoopFrame {
                line: 10,
                phase: "raf",
                stationmaster_zh: "UI 渲染管线阶段（执行 requestAnimationFrame 回调）",
                stationmaster_en: "UI Render Frame: Executing requestAnimationFrame",
                call_stack: &["cb_rAF", "console.log('执行栈：requestAnimationFrame')"],
                micro_queue: &[],
                raf_queue: &[],
                macro_queue: &["cb_timeout (setTimeout 0ms)"],
                idle_queue: &["cb_idle (requestIdleCallback)"],
                logs: &[
                    "执行栈：慢操作执行开始",
                    "执行栈：慢操作执行结束",
                    "执行栈：Promise",
                    "执行栈：requestAnimationFrame",
                ],
                desc_zh: "因耗时操作期间达到了屏幕刷新周期，UI 线程在重绘前触发 rAF 回调，打印 '执行栈：requestAnimationFrame'。",
                desc_en: "Browser enters repaint cycle and runs rAF callback: logs '执行栈：requestAnimationFrame'.",
            },
            LoopFrame {
                line: 7,
                phase: "macrotask",
                stationmaster_zh: "第二步检查宏任务队列（接普通列车 setTimeout）",
                stationmaster_en: "Step 2: Dequeue Macrotask (setTimeout)",
                call_stack: &["cb_timeout", "console.log('执行栈：setTimeout')"],
                micro_queue: &[],
                raf_queue: &[],
                macro_queue: &[],
                idle_queue: &["cb_idle (requestIdleCallback)"],
                logs: &[
                    "执行栈：慢操作执行开始",
                    "执行栈：慢操作执行结束",
                    "执行栈：Promise",
                    "执行栈：requestAnimationFrame",
                    "执行栈：setTimeout",
                ],
                desc_zh: "进入下一轮宏任务调度，从【宏任务队列】队头取出 cb_timeout 入栈执行，打印 '执行栈：setTimeout'。",
                desc_en: "Dequeues `cb_timeout` from Macrotask Queue and logs '执行栈：setTimeout'.",
            },
            LoopFrame {
                line: 4,
                phase: "idle",
                stationmaster_zh: "第三步进入空闲状态（触发 requestIdleCallback）",
                stationmaster_en: "Step 3: Stationmaster Idle (requestIdleCallback)",
                call_stack: &["cb_idle", "console.log('执行栈：requestIdleCallback')"],
                micro_queue: &[],
                raf_queue: &[],
                macro_queue: &[],
                idle_queue: &[],
                logs: &[
                    "执行栈：慢操作执行开始",
                    "执行栈：慢操作执行结束",
                    "执行栈：Promise",
                    "执行栈：requestAnimationFrame",
                    "执行栈：setTimeout",
                    "执行栈：requestIdleCallback",
                ],
                desc_zh: "当执行栈、微任务队列与宏任务队列全部清空，站长进入【空闲状态】，执行 requestIdleCallback 低优任务！",
                desc_en: "With Call Stack, Microtask, and Macrotask queues all empty, Stationmaster runs `requestIdleCallback`!",
            },
        ],
    };

    let mut out = String::with_capacity(4096);
    out.push_str("{\"authorized\":");
    out.push_str(if authorized { "true" } else { "false" });
    out.push_str(",\"scenarioId\":");
    out.push_str(&scenario_id.to_string());
    out.push_str(",\"steps\":[");

    for (idx, f) in frames.iter().enumerate() {
        if idx > 0 {
            out.push(',');
        }
        out.push_str("{\"stepIndex\":");
        out.push_str(&idx.to_string());
        out.push_str(",\"line\":");
        out.push_str(&f.line.to_string());
        out.push_str(",\"phase\":\"");
        escape_json(f.phase, &mut out);
        out.push_str("\",\"stationmasterZh\":\"");
        escape_json(f.stationmaster_zh, &mut out);
        out.push_str("\",\"stationmasterEn\":\"");
        escape_json(f.stationmaster_en, &mut out);
        out.push_str("\",\"descZh\":\"");
        escape_json(f.desc_zh, &mut out);
        out.push_str("\",\"descEn\":\"");
        escape_json(f.desc_en, &mut out);
        out.push_str("\",\"callStack\":[");
        for (i, item) in f.call_stack.iter().enumerate() {
            if i > 0 {
                out.push(',');
            }
            out.push('"');
            escape_json(item, &mut out);
            out.push('"');
        }
        out.push_str("],\"microQueue\":[");
        for (i, item) in f.micro_queue.iter().enumerate() {
            if i > 0 {
                out.push(',');
            }
            out.push('"');
            escape_json(item, &mut out);
            out.push('"');
        }
        out.push_str("],\"rafQueue\":[");
        for (i, item) in f.raf_queue.iter().enumerate() {
            if i > 0 {
                out.push(',');
            }
            out.push('"');
            escape_json(item, &mut out);
            out.push('"');
        }
        out.push_str("],\"macroQueue\":[");
        for (i, item) in f.macro_queue.iter().enumerate() {
            if i > 0 {
                out.push(',');
            }
            out.push('"');
            escape_json(item, &mut out);
            out.push('"');
        }
        out.push_str("],\"idleQueue\":[");
        for (i, item) in f.idle_queue.iter().enumerate() {
            if i > 0 {
                out.push(',');
            }
            out.push('"');
            escape_json(item, &mut out);
            out.push('"');
        }
        out.push_str("],\"logs\":[");
        for (i, item) in f.logs.iter().enumerate() {
            if i > 0 {
                out.push(',');
            }
            out.push('"');
            escape_json(item, &mut out);
            out.push('"');
        }
        out.push_str("]}");
    }

    out.push_str("]}");
    out
}

#[no_mangle]
pub extern "C" fn wasm_simulate_event_loop(
    host_ptr: *const u8,
    host_len: usize,
    scenario_id: u32,
) -> usize {
    let host = unsafe {
        std::str::from_utf8(slice::from_raw_parts(host_ptr, host_len)).unwrap_or("localhost")
    };
    let json = simulate_event_loop_internal(host, scenario_id);
    store_result(json);
    unsafe { RESULT_LEN }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vue_template_compiler() {
        let tpl = r#"<template><div class="card" :class="theme"><span class="static-badge">VIP</span><p>{{ msg }}</p><button @click="handleClick">Send</button></div></template>"#;
        let json = compile_vue_template_internal("yunsin.top", tpl);
        assert!(json.contains("\"authorized\":true"));
        assert!(json.contains("HOISTED (-1)"));
        assert!(json.contains("_createElementBlock"));
        assert!(json.contains("_hoisted_1"));
    }

    #[test]
    fn test_vue3_lis_sequence() {
        // Classic Vue 3 LIS test: [2, 3, 1, 5, 6, 4, 8, 9, 7] -> indices of [1, 4, 8, 9] or [2, 3, 5, 6, 8, 9]
        let seq = vue3_get_sequence(&[5, 3, 4, 0]);
        // Values at indices [1, 2] are [3, 4]
        assert_eq!(seq, vec![1, 2]);
    }

    #[test]
    fn test_vue_diff_simulation() {
        let json = simulate_vue_diff_internal("yunsin.top", "A,B,C,D,E,F,G", "A,B,E,C,D,H,F,G");
        assert!(json.contains("\"lisKeys\":[\"C\",\"D\"]"));
        assert!(json.contains("\"moves\":1"));
        assert!(json.contains("\"mounts\":1"));
    }

    #[test]
    fn test_http3_quic_simulation() {
        let json = simulate_http3_quic_internal("yunsin.top", 80, 5, true);
        assert!(json.contains("\"h2HandshakeMs\":160"));
        assert!(json.contains("\"h3HandshakeMs\":0"));
        assert!(json.contains("\"speedupPct\":"));
    }
}
