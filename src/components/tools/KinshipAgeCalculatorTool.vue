<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  lang?: 'zh' | 'en';
}

const props = withDefaults(defineProps<Readonly<Props>>(), {
  lang: 'zh',
});

const isEn = computed(() => props.lang === 'en');

type ActiveTab = 'kinship' | 'life';
const activeTab = ref<ActiveTab>('kinship');

// ==========================================
// TAB 1: Chinese Kinship Relationship Calculator (三姑六婆亲戚称呼计算器)
// ==========================================
type StepToken = 'f' | 'm' | 'h' | 'w' | 'ob' | 'lb' | 'os' | 'ls' | 's' | 'd';

interface StepMeta {
  token: StepToken;
  shortZh: string;
  wordZh: string;
  wordEn: string;
}

const STEP_BUTTONS: StepMeta[] = [
  { token: 'f', shortZh: '父', wordZh: '爸爸', wordEn: 'Father' },
  { token: 'm', shortZh: '母', wordZh: '妈妈', wordEn: 'Mother' },
  { token: 'h', shortZh: '夫', wordZh: '老公', wordEn: 'Husband' },
  { token: 'w', shortZh: '妻', wordZh: '老婆', wordEn: 'Wife' },
  { token: 'ob', shortZh: '兄', wordZh: '哥哥', wordEn: 'Older Brother' },
  { token: 'lb', shortZh: '弟', wordZh: '弟弟', wordEn: 'Younger Brother' },
  { token: 'os', shortZh: '姐', wordZh: '姐姐', wordEn: 'Older Sister' },
  { token: 'ls', shortZh: '妹', wordZh: '妹妹', wordEn: 'Younger Sister' },
  { token: 's', shortZh: '子', wordZh: '儿子', wordEn: 'Son' },
  { token: 'd', shortZh: '女', wordZh: '女儿', wordEn: 'Daughter' },
];

const speakerGender = ref<'male' | 'female'>('male');
const queryDirection = ref<'callThem' | 'callMe'>('callThem');
const chain = ref<StepToken[]>(['f', 'm', 'os', 's']);

interface KinshipEntry {
  zh: string;
  aliasZh: string;
  en: string;
  reciprocalMaleZh: string;
  reciprocalFemaleZh: string;
  branchTagZh: string;
}

// Comprehensive 125+ Chinese Kinship Graph Dictionary
const KINSHIP_DICT: Record<string, KinshipEntry> = {
  // 1st Step Direct
  f: { zh: '爸爸 / 父亲', aliasZh: '老爸、家父、令尊', en: 'Father', reciprocalMaleZh: '儿子', reciprocalFemaleZh: '女儿', branchTagZh: '直系尊亲属' },
  m: { zh: '妈妈 / 母亲', aliasZh: '老妈、家母、令堂', en: 'Mother', reciprocalMaleZh: '儿子', reciprocalFemaleZh: '女儿', branchTagZh: '直系尊亲属' },
  h: { zh: '老公 / 丈夫', aliasZh: '先生、爱人、官人', en: 'Husband', reciprocalMaleZh: '伴侣', reciprocalFemaleZh: '老婆 / 妻子', branchTagZh: '配偶关系' },
  w: { zh: '老婆 / 妻子', aliasZh: '太太、夫人、爱人', en: 'Wife', reciprocalMaleZh: '老公 / 丈夫', reciprocalFemaleZh: '伴侣', branchTagZh: '配偶关系' },
  ob: { zh: '哥哥 / 兄长', aliasZh: '老哥、胞兄、家兄', en: 'Older Brother', reciprocalMaleZh: '弟弟', reciprocalFemaleZh: '妹妹', branchTagZh: '同胞手足' },
  lb: { zh: '弟弟', aliasZh: '老弟、胞弟、舍弟', en: 'Younger Brother', reciprocalMaleZh: '哥哥', reciprocalFemaleZh: '姐姐', branchTagZh: '同胞手足' },
  os: { zh: '姐姐', aliasZh: '老姐、胞姐、家姐', en: 'Older Sister', reciprocalMaleZh: '弟弟', reciprocalFemaleZh: '妹妹', branchTagZh: '同胞手足' },
  ls: { zh: '妹妹', aliasZh: '老妹、胞妹、舍妹', en: 'Younger Sister', reciprocalMaleZh: '哥哥', reciprocalFemaleZh: '姐姐', branchTagZh: '同胞手足' },
  s: { zh: '儿子', aliasZh: '孩子、犬子、公子', en: 'Son', reciprocalMaleZh: '爸爸', reciprocalFemaleZh: '妈妈', branchTagZh: '直系卑亲属' },
  d: { zh: '女儿', aliasZh: '闺女、千金、小女', en: 'Daughter', reciprocalMaleZh: '爸爸', reciprocalFemaleZh: '妈妈', branchTagZh: '直系卑亲属' },

  // Paternal Grandparents & Great-Grandparents
  'f,f': { zh: '爷爷 / 祖父', aliasZh: '阿爷、公公（部分南方方言）', en: 'Paternal Grandfather', reciprocalMaleZh: '孙子', reciprocalFemaleZh: '孙女', branchTagZh: '父系祖辈' },
  'f,m': { zh: '奶奶 / 祖母', aliasZh: '阿奶、婆婆、嬷嬷', en: 'Paternal Grandmother', reciprocalMaleZh: '孙子', reciprocalFemaleZh: '孙女', branchTagZh: '父系祖辈' },
  'f,f,f': { zh: '太爷爷 / 曾祖父', aliasZh: '老太爷、太公', en: 'Paternal Great-Grandfather', reciprocalMaleZh: '曾孙', reciprocalFemaleZh: '曾孙女', branchTagZh: '父系曾祖辈' },
  'f,f,m': { zh: '太奶奶 / 曾祖母', aliasZh: '老太太、太婆', en: 'Paternal Great-Grandmother', reciprocalMaleZh: '曾孙', reciprocalFemaleZh: '曾孙女', branchTagZh: '父系曾祖辈' },
  'f,f,f,f': { zh: '高祖父 / 老太爷', aliasZh: '祖太爷', en: 'Great-Great-Grandfather', reciprocalMaleZh: '玄孙', reciprocalFemaleZh: '玄孙女', branchTagZh: '父系高祖辈' },
  'f,f,ob': { zh: '伯祖父 / 大爷', aliasZh: '伯公、太伯父', en: 'Paternal Great-Uncle (Older)', reciprocalMaleZh: '侄孙', reciprocalFemaleZh: '侄孙女', branchTagZh: '父系祖辈旁系' },
  'f,f,ob,w': { zh: '伯祖母 / 大奶奶', aliasZh: '伯婆', en: 'Paternal Great-Aunt', reciprocalMaleZh: '侄孙', reciprocalFemaleZh: '侄孙女', branchTagZh: '父系祖辈旁系' },
  'f,f,lb': { zh: '叔祖父 / 爷爷', aliasZh: '叔公、小爷爷', en: 'Paternal Great-Uncle (Younger)', reciprocalMaleZh: '侄孙', reciprocalFemaleZh: '侄孙女', branchTagZh: '父系祖辈旁系' },
  'f,f,lb,w': { zh: '叔祖母 / 婶婆', aliasZh: '叔婆、小奶奶', en: 'Paternal Great-Aunt', reciprocalMaleZh: '侄孙', reciprocalFemaleZh: '侄孙女', branchTagZh: '父系祖辈旁系' },
  'f,f,os': { zh: '姑奶奶 / 姑祖母', aliasZh: '姑婆、太姑妈', en: 'Paternal Great-Aunt (Father’s Aunt)', reciprocalMaleZh: '内侄孙', reciprocalFemaleZh: '内侄孙女', branchTagZh: '父系祖辈旁系' },
  'f,f,ls': { zh: '姑奶奶 / 姑祖母', aliasZh: '小姑奶奶、姑婆', en: 'Paternal Great-Aunt', reciprocalMaleZh: '内侄孙', reciprocalFemaleZh: '内侄孙女', branchTagZh: '父系祖辈旁系' },
  'f,f,os,h': { zh: '姑爷爷 / 姑祖父', aliasZh: '姑公、太姑父', en: 'Paternal Great-Uncle by Marriage', reciprocalMaleZh: '内侄孙', reciprocalFemaleZh: '内侄孙女', branchTagZh: '父系祖辈旁系' },
  'f,f,ls,h': { zh: '姑爷爷 / 姑祖父', aliasZh: '姑公、太姑父', en: 'Paternal Great-Uncle by Marriage', reciprocalMaleZh: '内侄孙', reciprocalFemaleZh: '内侄孙女', branchTagZh: '父系祖辈旁系' },
  'f,m,ob': { zh: '舅爷爷 / 舅公', aliasZh: '太舅父、外叔祖父', en: 'Grandmother’s Brother (Grand-Uncle)', reciprocalMaleZh: '外甥孙', reciprocalFemaleZh: '外甥孙女', branchTagZh: '父系外祖旁系' },
  'f,m,lb': { zh: '舅爷爷 / 舅公', aliasZh: '小舅爷爷、舅公', en: 'Grandmother’s Younger Brother', reciprocalMaleZh: '外甥孙', reciprocalFemaleZh: '外甥孙女', branchTagZh: '父系外祖旁系' },
  'f,m,ob,w': { zh: '舅奶奶 / 舅婆', aliasZh: '妗婆', en: 'Grand-Uncle’s Wife', reciprocalMaleZh: '外甥孙', reciprocalFemaleZh: '外甥孙女', branchTagZh: '父系外祖旁系' },
  'f,m,lb,w': { zh: '舅奶奶 / 舅婆', aliasZh: '妗婆', en: 'Grand-Uncle’s Wife', reciprocalMaleZh: '外甥孙', reciprocalFemaleZh: '外甥孙女', branchTagZh: '父系外祖旁系' },
  'f,m,os': { zh: '姨奶奶 / 姨婆', aliasZh: '太姨妈、大姨奶', en: 'Grandmother’s Older Sister', reciprocalMaleZh: '姨甥孙', reciprocalFemaleZh: '姨甥孙女', branchTagZh: '父系外祖旁系' },
  'f,m,ls': { zh: '姨奶奶 / 姨婆', aliasZh: '小姨奶', en: 'Grandmother’s Younger Sister', reciprocalMaleZh: '姨甥孙', reciprocalFemaleZh: '姨甥孙女', branchTagZh: '父系外祖旁系' },
  'f,m,os,h': { zh: '姨爷爷 / 姨公', aliasZh: '太姨父', en: 'Grandmother’s Sister’s Husband', reciprocalMaleZh: '姨甥孙', reciprocalFemaleZh: '姨甥孙女', branchTagZh: '父系外祖旁系' },
  'f,m,ls,h': { zh: '姨爷爷 / 姨公', aliasZh: '太姨父', en: 'Grandmother’s Sister’s Husband', reciprocalMaleZh: '姨甥孙', reciprocalFemaleZh: '姨甥孙女', branchTagZh: '父系外祖旁系' },
  'f,m,os,s': { zh: '表伯 / 表叔', aliasZh: '表伯父、表叔父（爸爸的姨表兄弟）', en: 'First Cousin Once Removed (Paternal)', reciprocalMaleZh: '表侄', reciprocalFemaleZh: '表侄女', branchTagZh: '父系表长辈' },
  'f,m,ls,s': { zh: '表伯 / 表叔', aliasZh: '表叔父（爸爸的姨表兄弟）', en: 'First Cousin Once Removed (Paternal)', reciprocalMaleZh: '表侄', reciprocalFemaleZh: '表侄女', branchTagZh: '父系表长辈' },
  'f,m,os,d': { zh: '表姑妈 / 表姑', aliasZh: '表姑母（爸爸的姨表姐妹）', en: 'First Cousin Once Removed (Female)', reciprocalMaleZh: '表侄', reciprocalFemaleZh: '表侄女', branchTagZh: '父系表长辈' },
  'f,m,ls,d': { zh: '表姑妈 / 表姑', aliasZh: '表姑母', en: 'First Cousin Once Removed (Female)', reciprocalMaleZh: '表侄', reciprocalFemaleZh: '表侄女', branchTagZh: '父系表长辈' },
  'f,m,ob,s': { zh: '表伯 / 表叔', aliasZh: '爸爸的舅表兄弟', en: 'Paternal First Cousin Once Removed', reciprocalMaleZh: '表侄', reciprocalFemaleZh: '表侄女', branchTagZh: '父系表长辈' },
  'f,m,lb,s': { zh: '表伯 / 表叔', aliasZh: '爸爸的舅表兄弟', en: 'Paternal First Cousin Once Removed', reciprocalMaleZh: '表侄', reciprocalFemaleZh: '表侄女', branchTagZh: '父系表长辈' },

  // Paternal Uncles, Aunts & Cousins (叔伯姑与堂表亲)
  'f,ob': { zh: '伯父 / 大爷', aliasZh: '大伯、阿伯、世伯', en: 'Paternal Uncle (Father’s Older Brother)', reciprocalMaleZh: '侄子', reciprocalFemaleZh: '侄女', branchTagZh: '父系长辈' },
  'f,ob,w': { zh: '伯母 / 大娘', aliasZh: '大妈、伯娘', en: 'Paternal Aunt (Father’s Older Brother’s Wife)', reciprocalMaleZh: '侄子', reciprocalFemaleZh: '侄女', branchTagZh: '父系长辈' },
  'f,lb': { zh: '叔叔 / 叔父', aliasZh: '小叔、阿叔、季父', en: 'Paternal Uncle (Father’s Younger Brother)', reciprocalMaleZh: '侄子', reciprocalFemaleZh: '侄女', branchTagZh: '父系长辈' },
  'f,lb,w': { zh: '婶婶 / 婶母', aliasZh: '婶子、阿婶、叔母', en: 'Paternal Aunt (Father’s Younger Brother’s Wife)', reciprocalMaleZh: '侄子', reciprocalFemaleZh: '侄女', branchTagZh: '父系长辈' },
  'f,os': { zh: '姑妈 / 大姑', aliasZh: '姑母、大姑姐', en: 'Paternal Aunt (Father’s Older Sister)', reciprocalMaleZh: '侄子 / 内侄', reciprocalFemaleZh: '侄女 / 内侄女', branchTagZh: '父系长辈' },
  'f,ls': { zh: '姑姑 / 小姑', aliasZh: '小姑妈、姑母', en: 'Paternal Aunt (Father’s Younger Sister)', reciprocalMaleZh: '侄子 / 内侄', reciprocalFemaleZh: '侄女 / 内侄女', branchTagZh: '父系长辈' },
  'f,os,h': { zh: '姑父 / 姑丈', aliasZh: '大姑父、姑夫', en: 'Paternal Uncle by Marriage (Father’s Sister’s Husband)', reciprocalMaleZh: '内侄', reciprocalFemaleZh: '内侄女', branchTagZh: '父系姻亲长辈' },
  'f,ls,h': { zh: '姑父 / 姑丈', aliasZh: '小姑父、姑夫', en: 'Paternal Uncle by Marriage', reciprocalMaleZh: '内侄', reciprocalFemaleZh: '内侄女', branchTagZh: '父系姻亲长辈' },
  'f,ob,s': { zh: '堂哥 / 堂弟', aliasZh: '堂兄弟、叔伯兄弟', en: 'Paternal Parallel Male Cousin (Tang)', reciprocalMaleZh: '堂弟 / 堂哥', reciprocalFemaleZh: '堂妹 / 堂姐', branchTagZh: '宗族堂亲' },
  'f,lb,s': { zh: '堂哥 / 堂弟', aliasZh: '堂兄弟、叔伯兄弟', en: 'Paternal Parallel Male Cousin (Tang)', reciprocalMaleZh: '堂哥 / 堂弟', reciprocalFemaleZh: '堂姐 / 堂妹', branchTagZh: '宗族堂亲' },
  'f,ob,d': { zh: '堂姐 / 堂妹', aliasZh: '堂姐妹、叔伯姐妹', en: 'Paternal Parallel Female Cousin (Tang)', reciprocalMaleZh: '堂弟 / 堂哥', reciprocalFemaleZh: '堂妹 / 堂姐', branchTagZh: '宗族堂亲' },
  'f,lb,d': { zh: '堂姐 / 堂妹', aliasZh: '堂姐妹、叔伯姐妹', en: 'Paternal Parallel Female Cousin (Tang)', reciprocalMaleZh: '堂哥 / 堂弟', reciprocalFemaleZh: '堂姐 / 堂妹', branchTagZh: '宗族堂亲' },
  'f,ob,s,w': { zh: '堂嫂 / 堂弟媳', aliasZh: '堂兄嫂、堂弟妹', en: 'Paternal Male Cousin’s Wife', reciprocalMaleZh: '堂叔 / 堂兄', reciprocalFemaleZh: '堂妹 / 堂姐', branchTagZh: '宗族堂亲' },
  'f,lb,s,w': { zh: '堂嫂 / 堂弟媳', aliasZh: '堂弟妹', en: 'Paternal Male Cousin’s Wife', reciprocalMaleZh: '堂兄 / 堂叔', reciprocalFemaleZh: '堂姐 / 堂妹', branchTagZh: '宗族堂亲' },
  'f,ob,s,s': { zh: '堂侄', aliasZh: '堂侄子', en: 'Paternal Cousin’s Son', reciprocalMaleZh: '堂叔 / 堂伯', reciprocalFemaleZh: '堂姑', branchTagZh: '堂亲晚辈' },
  'f,ob,s,d': { zh: '堂侄女', aliasZh: '堂侄闺女', en: 'Paternal Cousin’s Daughter', reciprocalMaleZh: '堂叔 / 堂伯', reciprocalFemaleZh: '堂姑', branchTagZh: '堂亲晚辈' },
  'f,os,s': { zh: '表哥 / 表弟（姑表）', aliasZh: '姑表兄弟', en: 'Paternal Cross Male Cousin (Biao)', reciprocalMaleZh: '表弟 / 表哥', reciprocalFemaleZh: '表妹 / 表姐', branchTagZh: '姑表亲属' },
  'f,ls,s': { zh: '表哥 / 表弟（姑表）', aliasZh: '姑表兄弟', en: 'Paternal Cross Male Cousin (Biao)', reciprocalMaleZh: '表哥 / 表弟', reciprocalFemaleZh: '表姐 / 表妹', branchTagZh: '姑表亲属' },
  'f,os,d': { zh: '表姐 / 表妹（姑表）', aliasZh: '姑表姐妹', en: 'Paternal Cross Female Cousin (Biao)', reciprocalMaleZh: '表弟 / 表哥', reciprocalFemaleZh: '表妹 / 表姐', branchTagZh: '姑表亲属' },
  'f,ls,d': { zh: '表姐 / 表妹（姑表）', aliasZh: '姑表姐妹', en: 'Paternal Cross Female Cousin (Biao)', reciprocalMaleZh: '表哥 / 表弟', reciprocalFemaleZh: '表姐 / 表妹', branchTagZh: '姑表亲属' },

  // Maternal Grandparents, Uncles, Aunts & Cousins (外公外婆与舅姨表亲)
  'm,f': { zh: '外公 / 姥爷', aliasZh: '外祖父、阿公', en: 'Maternal Grandfather', reciprocalMaleZh: '外孙', reciprocalFemaleZh: '外孙女', branchTagZh: '母系祖辈' },
  'm,m': { zh: '外婆 / 姥姥', aliasZh: '外祖母、阿婆', en: 'Maternal Grandmother', reciprocalMaleZh: '外孙', reciprocalFemaleZh: '外孙女', branchTagZh: '母系祖辈' },
  'm,f,f': { zh: '太姥爷 / 外曾祖父', aliasZh: '太外公', en: 'Maternal Great-Grandfather', reciprocalMaleZh: '外曾孙', reciprocalFemaleZh: '外曾孙女', branchTagZh: '母系曾祖辈' },
  'm,f,m': { zh: '太姥姥 / 外曾祖母', aliasZh: '太外婆', en: 'Maternal Great-Grandmother', reciprocalMaleZh: '外曾孙', reciprocalFemaleZh: '外曾孙女', branchTagZh: '母系曾祖辈' },
  'm,m,ob': { zh: '舅外公 / 舅姥爷', aliasZh: '太舅公、大舅姥爷', en: 'Maternal Grandmother’s Brother', reciprocalMaleZh: '外甥外孙', reciprocalFemaleZh: '外甥外孙女', branchTagZh: '母系祖辈旁系' },
  'm,m,lb': { zh: '舅外公 / 舅姥爷', aliasZh: '小舅姥爷', en: 'Maternal Grandmother’s Younger Brother', reciprocalMaleZh: '外甥外孙', reciprocalFemaleZh: '外甥外孙女', branchTagZh: '母系祖辈旁系' },
  'm,m,os': { zh: '姨外婆 / 姨姥姥', aliasZh: '大姨姥姥、姨婆', en: 'Maternal Grandmother’s Sister', reciprocalMaleZh: '姨甥外孙', reciprocalFemaleZh: '姨甥外孙女', branchTagZh: '母系祖辈旁系' },
  'm,m,ls': { zh: '姨外婆 / 姨姥姥', aliasZh: '小姨姥姥、姨婆', en: 'Maternal Grandmother’s Younger Sister', reciprocalMaleZh: '姨甥外孙', reciprocalFemaleZh: '姨甥外孙女', branchTagZh: '母系祖辈旁系' },
  'm,m,os,s': { zh: '表舅', aliasZh: '妈妈的姨表兄弟', en: 'Maternal First Cousin Once Removed (Male)', reciprocalMaleZh: '表外甥', reciprocalFemaleZh: '表外甥女', branchTagZh: '母系表长辈' },
  'm,m,ls,s': { zh: '表舅', aliasZh: '妈妈的姨表兄弟', en: 'Maternal First Cousin Once Removed (Male)', reciprocalMaleZh: '表外甥', reciprocalFemaleZh: '表外甥女', branchTagZh: '母系表长辈' },
  'm,m,os,d': { zh: '表姨 / 表姨妈', aliasZh: '妈妈的姨表姐妹', en: 'Maternal First Cousin Once Removed (Female)', reciprocalMaleZh: '表外甥', reciprocalFemaleZh: '表外甥女', branchTagZh: '母系表长辈' },
  'm,m,ls,d': { zh: '表姨 / 表姨妈', aliasZh: '妈妈的姨表姐妹', en: 'Maternal First Cousin Once Removed (Female)', reciprocalMaleZh: '表外甥', reciprocalFemaleZh: '表外甥女', branchTagZh: '母系表长辈' },
  'm,ob': { zh: '大舅 / 舅舅', aliasZh: '舅父、阿舅、母舅', en: 'Maternal Uncle (Mother’s Older Brother)', reciprocalMaleZh: '外甥', reciprocalFemaleZh: '外甥女', branchTagZh: '母系长辈' },
  'm,lb': { zh: '小舅 / 舅舅', aliasZh: '小舅父、阿舅', en: 'Maternal Uncle (Mother’s Younger Brother)', reciprocalMaleZh: '外甥', reciprocalFemaleZh: '外甥女', branchTagZh: '母系长辈' },
  'm,ob,w': { zh: '大舅妈 / 舅妈', aliasZh: '舅母、妗子、大妗妈', en: 'Maternal Aunt (Mother’s Brother’s Wife)', reciprocalMaleZh: '外甥', reciprocalFemaleZh: '外甥女', branchTagZh: '母系姻亲长辈' },
  'm,lb,w': { zh: '小舅妈 / 舅妈', aliasZh: '舅母、小妗子', en: 'Maternal Aunt (Mother’s Younger Brother’s Wife)', reciprocalMaleZh: '外甥', reciprocalFemaleZh: '外甥女', branchTagZh: '母系姻亲长辈' },
  'm,os': { zh: '大姨 / 姨妈', aliasZh: '姨母、大姨妈', en: 'Maternal Aunt (Mother’s Older Sister)', reciprocalMaleZh: '外甥 / 姨甥', reciprocalFemaleZh: '外甥女 / 姨甥女', branchTagZh: '母系长辈' },
  'm,ls': { zh: '小姨 / 阿姨', aliasZh: '小姨子、小姨妈、姨母', en: 'Maternal Aunt (Mother’s Younger Sister)', reciprocalMaleZh: '外甥 / 姨甥', reciprocalFemaleZh: '外甥女 / 姨甥女', branchTagZh: '母系长辈' },
  'm,os,h': { zh: '大姨父 / 姨丈', aliasZh: '姨夫、大姨丈', en: 'Maternal Uncle by Marriage (Mother’s Sister’s Husband)', reciprocalMaleZh: '姨甥 / 外甥', reciprocalFemaleZh: '姨甥女 / 外甥女', branchTagZh: '母系姻亲长辈' },
  'm,ls,h': { zh: '小姨父 / 姨丈', aliasZh: '小姨夫、姨丈', en: 'Maternal Uncle by Marriage', reciprocalMaleZh: '姨甥 / 外甥', reciprocalFemaleZh: '姨甥女 / 外甥女', branchTagZh: '母系姻亲长辈' },
  'm,ob,s': { zh: '表哥 / 表弟（舅表）', aliasZh: '舅表兄弟', en: 'Maternal Male Cousin (Jiu-Biao)', reciprocalMaleZh: '表弟 / 表哥', reciprocalFemaleZh: '表妹 / 表姐', branchTagZh: '舅表亲属' },
  'm,lb,s': { zh: '表哥 / 表弟（舅表）', aliasZh: '舅表兄弟', en: 'Maternal Male Cousin (Jiu-Biao)', reciprocalMaleZh: '表哥 / 表弟', reciprocalFemaleZh: '表姐 / 表妹', branchTagZh: '舅表亲属' },
  'm,ob,d': { zh: '表姐 / 表妹（舅表）', aliasZh: '舅表姐妹', en: 'Maternal Female Cousin (Jiu-Biao)', reciprocalMaleZh: '表弟 / 表哥', reciprocalFemaleZh: '表妹 / 表姐', branchTagZh: '舅表亲属' },
  'm,lb,d': { zh: '表姐 / 表妹（舅表）', aliasZh: '舅表姐妹', en: 'Maternal Female Cousin (Jiu-Biao)', reciprocalMaleZh: '表哥 / 表弟', reciprocalFemaleZh: '表姐 / 表妹', branchTagZh: '舅表亲属' },
  'm,os,s': { zh: '表哥 / 表弟（姨表）', aliasZh: '姨表兄弟、从母兄弟', en: 'Maternal Parallel Male Cousin (Yi-Biao)', reciprocalMaleZh: '表弟 / 表哥', reciprocalFemaleZh: '表妹 / 表姐', branchTagZh: '姨表亲属' },
  'm,ls,s': { zh: '表哥 / 表弟（姨表）', aliasZh: '姨表兄弟', en: 'Maternal Parallel Male Cousin (Yi-Biao)', reciprocalMaleZh: '表哥 / 表弟', reciprocalFemaleZh: '表姐 / 表妹', branchTagZh: '姨表亲属' },
  'm,os,d': { zh: '表姐 / 表妹（姨表）', aliasZh: '姨表姐妹', en: 'Maternal Parallel Female Cousin (Yi-Biao)', reciprocalMaleZh: '表弟 / 表哥', reciprocalFemaleZh: '表妹 / 表姐', branchTagZh: '姨表亲属' },
  'm,ls,d': { zh: '表姐 / 表妹（姨表）', aliasZh: '姨表姐妹', en: 'Maternal Parallel Female Cousin (Yi-Biao)', reciprocalMaleZh: '表哥 / 表弟', reciprocalFemaleZh: '表姐 / 表妹', branchTagZh: '姨表亲属' },
  'm,ob,s,w': { zh: '表嫂 / 表弟媳', aliasZh: '表兄嫂、表弟妹', en: 'Maternal Cousin’s Wife', reciprocalMaleZh: '表弟 / 表哥', reciprocalFemaleZh: '表妹 / 表姐', branchTagZh: '表亲姻亲' },
  'm,os,s,w': { zh: '表嫂 / 表弟媳', aliasZh: '表兄嫂、表弟妹', en: 'Maternal Cousin’s Wife', reciprocalMaleZh: '表弟 / 表哥', reciprocalFemaleZh: '表妹 / 表姐', branchTagZh: '表亲姻亲' },
  'm,ob,s,s': { zh: '表侄 / 表外甥', aliasZh: '表哥表弟之子', en: 'Cousin’s Son', reciprocalMaleZh: '表叔 / 表伯', reciprocalFemaleZh: '表姑 / 表姨', branchTagZh: '表亲晚辈' },
  'm,ob,s,d': { zh: '表侄女 / 表外甥女', aliasZh: '表哥表弟之女', en: 'Cousin’s Daughter', reciprocalMaleZh: '表叔 / 表伯', reciprocalFemaleZh: '表姑 / 表姨', branchTagZh: '表亲晚辈' },

  // Siblings' Spouses & Children (嫂子、弟媳、姐夫、妹夫、侄子、外甥)
  'ob,w': { zh: '嫂子 / 兄嫂', aliasZh: '大嫂、阿嫂', en: 'Older Brother’s Wife (Sister-in-Law)', reciprocalMaleZh: '小叔子', reciprocalFemaleZh: '小姑子', branchTagZh: '同辈姻亲' },
  'lb,w': { zh: '弟媳 / 弟妹', aliasZh: '弟妇', en: 'Younger Brother’s Wife (Sister-in-Law)', reciprocalMaleZh: '大伯哥', reciprocalFemaleZh: '大姑姐', branchTagZh: '同辈姻亲' },
  'os,h': { zh: '姐夫', aliasZh: '大姐夫、姐丈', en: 'Older Sister’s Husband (Brother-in-Law)', reciprocalMaleZh: '小舅子', reciprocalFemaleZh: '小姨子', branchTagZh: '同辈姻亲' },
  'ls,h': { zh: '妹夫 / 妹婿', aliasZh: '妹丈', en: 'Younger Sister’s Husband (Brother-in-Law)', reciprocalMaleZh: '大舅哥', reciprocalFemaleZh: '大姨姐', branchTagZh: '同辈姻亲' },
  'ob,s': { zh: '侄子', aliasZh: '胞侄、大侄子', en: 'Brother’s Son (Nephew)', reciprocalMaleZh: '叔叔（叔父）', reciprocalFemaleZh: '姑妈 / 姑姑', branchTagZh: '同宗晚辈' },
  'lb,s': { zh: '侄子', aliasZh: '胞侄、侄儿', en: 'Younger Brother’s Son (Nephew)', reciprocalMaleZh: '伯父（大爷）', reciprocalFemaleZh: '姑妈 / 姑姑', branchTagZh: '同宗晚辈' },
  'ob,d': { zh: '侄女', aliasZh: '胞侄女、大侄女', en: 'Brother’s Daughter (Niece)', reciprocalMaleZh: '叔叔（叔父）', reciprocalFemaleZh: '姑妈 / 姑姑', branchTagZh: '同宗晚辈' },
  'lb,d': { zh: '侄女', aliasZh: '胞侄女', en: 'Younger Brother’s Daughter (Niece)', reciprocalMaleZh: '伯父（大爷）', reciprocalFemaleZh: '姑妈 / 姑姑', branchTagZh: '同宗晚辈' },
  'ob,s,w': { zh: '侄媳妇', aliasZh: '侄媳', en: 'Nephew’s Wife', reciprocalMaleZh: '叔公 / 伯父', reciprocalFemaleZh: '姑妈 / 姑婆', branchTagZh: '同宗晚辈姻亲' },
  'ob,d,h': { zh: '侄女婿', aliasZh: '侄婿', en: 'Niece’s Husband', reciprocalMaleZh: '叔岳父 / 伯父', reciprocalFemaleZh: '姑岳母 / 姑妈', branchTagZh: '同宗晚辈姻亲' },
  'ob,s,s': { zh: '侄孙', aliasZh: '重侄', en: 'Brother’s Grandson (Grand-Nephew)', reciprocalMaleZh: '叔公 / 伯祖父', reciprocalFemaleZh: '姑奶奶 / 姑婆', branchTagZh: '同宗孙辈' },
  'ob,s,d': { zh: '侄孙女', aliasZh: '重侄女', en: 'Brother’s Granddaughter', reciprocalMaleZh: '叔公 / 伯祖父', reciprocalFemaleZh: '姑奶奶 / 姑婆', branchTagZh: '同宗孙辈' },
  'os,s': { zh: '外甥', aliasZh: '外甥儿', en: 'Sister’s Son (Nephew)', reciprocalMaleZh: '舅舅', reciprocalFemaleZh: '姨妈 / 小姨', branchTagZh: '外亲晚辈' },
  'ls,s': { zh: '外甥', aliasZh: '外甥儿', en: 'Younger Sister’s Son (Nephew)', reciprocalMaleZh: '舅舅', reciprocalFemaleZh: '大姨 / 姨妈', branchTagZh: '外亲晚辈' },
  'os,d': { zh: '外甥女', aliasZh: '外甥闺女', en: 'Sister’s Daughter (Niece)', reciprocalMaleZh: '舅舅', reciprocalFemaleZh: '姨妈 / 小姨', branchTagZh: '外亲晚辈' },
  'ls,d': { zh: '外甥女', aliasZh: '外甥闺女', en: 'Younger Sister’s Daughter (Niece)', reciprocalMaleZh: '舅舅', reciprocalFemaleZh: '大姨 / 姨妈', branchTagZh: '外亲晚辈' },
  'os,s,s': { zh: '外甥孙', aliasZh: '甥孙', en: 'Sister’s Grandson', reciprocalMaleZh: '舅公 / 舅爷爷', reciprocalFemaleZh: '姨奶奶 / 姨婆', branchTagZh: '外亲孙辈' },

  // Wife's Family (妻族姻亲：岳父岳母、大舅子小姨子、连襟)
  'w,f': { zh: '岳父 / 老丈人', aliasZh: '丈人、泰山、爸爸（婚后改口）', en: 'Father-in-Law (Wife’s Father)', reciprocalMaleZh: '女婿 / 姑爷', reciprocalFemaleZh: '儿媳', branchTagZh: '妻系长辈' },
  'w,m': { zh: '岳母 / 丈母娘', aliasZh: '泰水、妈妈（婚后改口）', en: 'Mother-in-Law (Wife’s Mother)', reciprocalMaleZh: '女婿 / 姑爷', reciprocalFemaleZh: '儿媳', branchTagZh: '妻系长辈' },
  'w,f,f': { zh: '太岳父 / 岳祖父', aliasZh: '老婆的爷爷', en: 'Wife’s Grandfather', reciprocalMaleZh: '孙女婿', reciprocalFemaleZh: '孙媳', branchTagZh: '妻系祖辈' },
  'w,f,m': { zh: '太岳母 / 岳祖母', aliasZh: '老婆的奶奶', en: 'Wife’s Grandmother', reciprocalMaleZh: '孙女婿', reciprocalFemaleZh: '孙媳', branchTagZh: '妻系祖辈' },
  'w,f,ob': { zh: '伯岳父 / 大伯丈', aliasZh: '老婆的大伯', en: 'Wife’s Paternal Older Uncle', reciprocalMaleZh: '侄女婿', reciprocalFemaleZh: '侄媳', branchTagZh: '妻系旁系长辈' },
  'w,f,lb': { zh: '叔岳父 / 叔丈人', aliasZh: '老婆的叔叔', en: 'Wife’s Paternal Younger Uncle', reciprocalMaleZh: '侄女婿', reciprocalFemaleZh: '侄媳', branchTagZh: '妻系旁系长辈' },
  'w,f,os': { zh: '姑岳母 / 姑丈母', aliasZh: '老婆的姑妈', en: 'Wife’s Paternal Aunt', reciprocalMaleZh: '内侄女婿', reciprocalFemaleZh: '内侄媳', branchTagZh: '妻系旁系长辈' },
  'w,m,ob': { zh: '舅岳父 / 舅丈人', aliasZh: '老婆的舅舅', en: 'Wife’s Maternal Uncle', reciprocalMaleZh: '外甥女婿', reciprocalFemaleZh: '外甥媳', branchTagZh: '妻系旁系长辈' },
  'w,m,os': { zh: '姨岳母 / 姨丈母', aliasZh: '老婆的姨妈', en: 'Wife’s Maternal Aunt', reciprocalMaleZh: '姨甥女婿', reciprocalFemaleZh: '姨甥媳', branchTagZh: '妻系旁系长辈' },
  'w,ob': { zh: '大舅哥 / 大舅子', aliasZh: '内兄、妻兄', en: 'Wife’s Older Brother (Brother-in-Law)', reciprocalMaleZh: '妹夫', reciprocalFemaleZh: '弟媳', branchTagZh: '妻系平辈' },
  'w,lb': { zh: '小舅子 / 妻弟', aliasZh: '内弟、小舅弟', en: 'Wife’s Younger Brother (Brother-in-Law)', reciprocalMaleZh: '姐夫', reciprocalFemaleZh: '嫂子', branchTagZh: '妻系平辈' },
  'w,ob,w': { zh: '大舅嫂 / 舅嫂', aliasZh: '内嫂、大舅媳妇', en: 'Wife’s Older Brother’s Wife', reciprocalMaleZh: '姑爷 / 妹夫', reciprocalFemaleZh: '小姑', branchTagZh: '妻系平辈' },
  'w,lb,w': { zh: '小舅弟媳 / 舅弟妹', aliasZh: '内弟妇', en: 'Wife’s Younger Brother’s Wife', reciprocalMaleZh: '姐夫', reciprocalFemaleZh: '大姑姐', branchTagZh: '妻系平辈' },
  'w,os': { zh: '大姨姐 / 大姨子', aliasZh: '妻姐、内姐', en: 'Wife’s Older Sister (Sister-in-Law)', reciprocalMaleZh: '妹夫', reciprocalFemaleZh: '弟媳', branchTagZh: '妻系平辈' },
  'w,ls': { zh: '小姨子 / 小姨妹', aliasZh: '妻妹、内妹', en: 'Wife’s Younger Sister (Sister-in-Law)', reciprocalMaleZh: '姐夫', reciprocalFemaleZh: '嫂子', branchTagZh: '妻系平辈' },
  'w,os,h': { zh: '大连襟 / 襟兄', aliasZh: '连襟、友婿、老挑、大姨夫', en: 'Wife’s Older Sister’s Husband (Co-Brother-in-Law)', reciprocalMaleZh: '小连襟 / 襟弟', reciprocalFemaleZh: '小姨子', branchTagZh: '连襟关系' },
  'w,ls,h': { zh: '小连襟 / 襟弟', aliasZh: '连襟、友婿、老挑、小姨夫', en: 'Wife’s Younger Sister’s Husband (Co-Brother-in-Law)', reciprocalMaleZh: '大连襟 / 襟兄', reciprocalFemaleZh: '大姨姐', branchTagZh: '连襟关系' },
  'w,ob,s': { zh: '内侄', aliasZh: '妻侄', en: 'Wife’s Brother’s Son', reciprocalMaleZh: '姑父', reciprocalFemaleZh: '姑妈', branchTagZh: '妻系晚辈' },
  'w,ob,d': { zh: '内侄女', aliasZh: '妻侄女', en: 'Wife’s Brother’s Daughter', reciprocalMaleZh: '姑父', reciprocalFemaleZh: '姑妈', branchTagZh: '妻系晚辈' },
  'w,os,s': { zh: '姨甥 / 外甥', aliasZh: '妻外甥', en: 'Wife’s Sister’s Son', reciprocalMaleZh: '姨父', reciprocalFemaleZh: '姨妈', branchTagZh: '妻系晚辈' },

  // Husband's Family (夫族姻亲：公婆、大伯子小叔子、妯娌)
  'h,f': { zh: '公公 / 家公', aliasZh: '老爷、爸爸（婚后改口）', en: 'Father-in-Law (Husband’s Father)', reciprocalMaleZh: '女婿', reciprocalFemaleZh: '儿媳妇', branchTagZh: '夫系长辈' },
  'h,m': { zh: '婆婆 / 家婆', aliasZh: '婆母、妈妈（婚后改口）', en: 'Mother-in-Law (Husband’s Mother)', reciprocalMaleZh: '女婿', reciprocalFemaleZh: '儿媳妇', branchTagZh: '夫系长辈' },
  'h,f,f': { zh: '太公公 / 祖翁', aliasZh: '老公的爷爷', en: 'Husband’s Grandfather', reciprocalMaleZh: '孙婿', reciprocalFemaleZh: '孙媳妇', branchTagZh: '夫系祖辈' },
  'h,f,m': { zh: '太婆婆 / 祖姑', aliasZh: '老公的奶奶', en: 'Husband’s Grandmother', reciprocalMaleZh: '孙婿', reciprocalFemaleZh: '孙媳妇', branchTagZh: '夫系祖辈' },
  'h,ob': { zh: '大伯哥 / 大伯子', aliasZh: '夫兄、大哥', en: 'Husband’s Older Brother (Brother-in-Law)', reciprocalMaleZh: '弟妹', reciprocalFemaleZh: '弟媳 / 弟妹', branchTagZh: '夫系平辈' },
  'h,lb': { zh: '小叔子 / 小叔', aliasZh: '夫弟、小叔弟', en: 'Husband’s Younger Brother (Brother-in-Law)', reciprocalMaleZh: '嫂子', reciprocalFemaleZh: '嫂子 / 大嫂', branchTagZh: '夫系平辈' },
  'h,ob,w': { zh: '大嫂 / 妯娌（姒）', aliasZh: '大伯嫂、先、妯娌姐姐', en: 'Husband’s Older Brother’s Wife (Co-Sister-in-Law)', reciprocalMaleZh: '小叔', reciprocalFemaleZh: '弟妹 / 妯娌（娣）', branchTagZh: '妯娌关系' },
  'h,lb,w': { zh: '弟妹 / 妯娌（娣）', aliasZh: '小婶、小叔媳妇、妯娌妹妹', en: 'Husband’s Younger Brother’s Wife (Co-Sister-in-Law)', reciprocalMaleZh: '大伯', reciprocalFemaleZh: '大嫂 / 妯娌（姒）', branchTagZh: '妯娌关系' },
  'h,os': { zh: '大姑姐 / 大姑子', aliasZh: '夫姐、大姐', en: 'Husband’s Older Sister (Sister-in-Law)', reciprocalMaleZh: '弟妹', reciprocalFemaleZh: '弟媳 / 弟妹', branchTagZh: '夫系平辈' },
  'h,ls': { zh: '小姑子 / 小姑妹', aliasZh: '夫妹、小妹', en: 'Husband’s Younger Sister (Sister-in-Law)', reciprocalMaleZh: '嫂子', reciprocalFemaleZh: '嫂子 / 大嫂', branchTagZh: '夫系平辈' },
  'h,os,h': { zh: '大姑姐夫', aliasZh: '大姐夫', en: 'Husband’s Older Sister’s Husband', reciprocalMaleZh: '小舅子', reciprocalFemaleZh: '小舅媳妇', branchTagZh: '夫系平辈' },
  'h,ls,h': { zh: '小姑妹夫', aliasZh: '妹夫', en: 'Husband’s Younger Sister’s Husband', reciprocalMaleZh: '大舅哥', reciprocalFemaleZh: '大舅嫂', branchTagZh: '夫系平辈' },

  // Children, Grandchildren & In-Laws (儿媳、女婿、孙辈、亲家)
  's,w': { zh: '儿媳妇 / 儿媳', aliasZh: '新妇、媳妇', en: 'Daughter-in-Law (Son’s Wife)', reciprocalMaleZh: '公公', reciprocalFemaleZh: '婆婆', branchTagZh: '直系晚辈姻亲' },
  'd,h': { zh: '女婿 / 姑爷', aliasZh: '半子、东床、快婿', en: 'Son-in-Law (Daughter’s Husband)', reciprocalMaleZh: '岳父 / 老丈人', reciprocalFemaleZh: '岳母 / 丈母娘', branchTagZh: '直系晚辈姻亲' },
  's,w,f': { zh: '亲家公', aliasZh: '亲家老爷、姻兄', en: 'Co-Father-in-Law (Child’s Spouse’s Father)', reciprocalMaleZh: '亲家公', reciprocalFemaleZh: '亲家母', branchTagZh: '儿女亲家' },
  's,w,m': { zh: '亲家母', aliasZh: '亲家太太、姻嫂', en: 'Co-Mother-in-Law (Child’s Spouse’s Mother)', reciprocalMaleZh: '亲家公', reciprocalFemaleZh: '亲家母', branchTagZh: '儿女亲家' },
  'd,h,f': { zh: '亲家公', aliasZh: '亲家老爷、姻兄', en: 'Co-Father-in-Law', reciprocalMaleZh: '亲家公', reciprocalFemaleZh: '亲家母', branchTagZh: '儿女亲家' },
  'd,h,m': { zh: '亲家母', aliasZh: '亲家太太、姻嫂', en: 'Co-Mother-in-Law', reciprocalMaleZh: '亲家公', reciprocalFemaleZh: '亲家母', branchTagZh: '儿女亲家' },
  's,s': { zh: '孙子', aliasZh: '大孙子、内孙', en: 'Paternal Grandson (Son’s Son)', reciprocalMaleZh: '爷爷', reciprocalFemaleZh: '奶奶', branchTagZh: '直系孙辈' },
  's,d': { zh: '孙女', aliasZh: '孙闺女、内孙女', en: 'Paternal Granddaughter (Son’s Daughter)', reciprocalMaleZh: '爷爷', reciprocalFemaleZh: '奶奶', branchTagZh: '直系孙辈' },
  's,s,w': { zh: '孙媳妇', aliasZh: '孙媳', en: 'Grandson’s Wife', reciprocalMaleZh: '太公 / 爷爷', reciprocalFemaleZh: '太婆 / 奶奶', branchTagZh: '孙辈姻亲' },
  's,d,h': { zh: '孙女婿', aliasZh: '孙婿', en: 'Granddaughter’s Husband', reciprocalMaleZh: '太岳父 / 爷爷', reciprocalFemaleZh: '太岳母 / 奶奶', branchTagZh: '孙辈姻亲' },
  's,s,s': { zh: '曾孙 / 重孙', aliasZh: '重孙子', en: 'Great-Grandson', reciprocalMaleZh: '太爷爷 / 曾祖父', reciprocalFemaleZh: '太奶奶 / 曾祖母', branchTagZh: '曾孙辈' },
  's,s,d': { zh: '曾孙女 / 重孙女', aliasZh: '重孙闺女', en: 'Great-Granddaughter', reciprocalMaleZh: '太爷爷 / 曾祖父', reciprocalFemaleZh: '太奶奶 / 曾祖母', branchTagZh: '曾孙辈' },
  'd,s': { zh: '外孙', aliasZh: '外孙子', en: 'Maternal Grandson (Daughter’s Son)', reciprocalMaleZh: '外公 / 姥爷', reciprocalFemaleZh: '外婆 / 姥姥', branchTagZh: '直系外孙辈' },
  'd,d': { zh: '外孙女', aliasZh: '外孙闺女', en: 'Maternal Granddaughter (Daughter’s Daughter)', reciprocalMaleZh: '外公 / 姥爷', reciprocalFemaleZh: '外婆 / 姥姥', branchTagZh: '直系外孙辈' },
  'd,s,s': { zh: '外曾孙', aliasZh: '重外孙', en: 'Maternal Great-Grandson', reciprocalMaleZh: '太姥爷 / 太外公', reciprocalFemaleZh: '太姥姥 / 太外婆', branchTagZh: '外曾孙辈' },
};

/**
 * Algebraic reduction rules for multi-step kinship chains:
 * Collapses redundant transitions like "father's wife -> mother", "brother's father -> father", etc.
 */
function normalizeChain(tokens: StepToken[]): StepToken[] {
  let str = tokens.join(',');
  const rules: Array<[RegExp, string]> = [
    [/\bf,w\b/g, 'm'],
    [/\bm,h\b/g, 'f'],
    [/\b(ob|lb|os|ls),f\b/g, 'f'],
    [/\b(ob|lb|os|ls),m\b/g, 'm'],
    [/\b(s|d),f\b/g, 'h'],
    [/\b(s|d),m\b/g, 'w'],
    [/\bf,ob,lb\b/g, 'f,ob'],
    [/\b(ob|lb),ob\b/g, 'ob'],
    [/\b(os|ls),os\b/g, 'os'],
  ];

  for (let pass = 0; pass < 4; pass++) {
    let prev = str;
    for (const [pattern, replacement] of rules) {
      str = str.replace(pattern, replacement);
    }
    if (str === prev) break;
  }
  return str ? (str.split(',') as StepToken[]) : [];
}

const expressionText = computed(() => {
  if (chain.value.length === 0) {
    return isEn.value ? 'Me (Self)' : '我（自己）';
  }
  const mapObj = Object.fromEntries(
    STEP_BUTTONS.map((b) => [b.token, isEn.value ? b.wordEn : b.wordZh])
  );
  return isEn.value
    ? `My ${chain.value.map((t) => mapObj[t]).join("'s ")}`
    : `我的${chain.value.map((t) => mapObj[t]).join('的')}`;
});

const resolvedKinship = computed<KinshipEntry>(() => {
  if (chain.value.length === 0) {
    return {
      zh: '我自己 / 本人',
      aliasZh: '在下、鄙人、吾',
      en: 'Myself',
      reciprocalMaleZh: '我自己',
      reciprocalFemaleZh: '我自己',
      branchTagZh: '本人',
    };
  }
  const norm = normalizeChain(chain.value);
  const key = norm.join(',');
  if (KINSHIP_DICT[key]) {
    return KINSHIP_DICT[key];
  }
  return {
    zh: '远房亲戚 / 宗族亲属',
    aliasZh: '按辈分可呼为叔伯/姑姨/兄弟姐妹',
    en: 'Extended Relative',
    reciprocalMaleZh: '远房晚辈 / 亲戚',
    reciprocalFemaleZh: '远房晚辈 / 亲戚',
    branchTagZh: '远房姻亲/宗亲',
  };
});

function appendStep(token: StepToken) {
  if (chain.value.length < 8) {
    chain.value.push(token);
  }
}

function backspaceStep() {
  chain.value.pop();
}

function clearChain() {
  chain.value = [];
}

interface ViralPreset {
  labelZh: string;
  labelEn: string;
  tokens: StepToken[];
}

const VIRAL_PRESETS: ViralPreset[] = [
  { labelZh: '爸爸的妈妈的姐姐的儿子', labelEn: "Father's Mother's Sister's Son", tokens: ['f', 'm', 'os', 's'] },
  { labelZh: '妈妈的妈妈的妹妹的女儿', labelEn: "Mother's Mother's Sister's Daughter", tokens: ['m', 'm', 'ls', 'd'] },
  { labelZh: '老婆的姐姐的老公（连襟）', labelEn: "Wife's Older Sister's Husband", tokens: ['w', 'os', 'h'] },
  { labelZh: '老公的哥哥的老婆（妯娌）', labelEn: "Husband's Older Brother's Wife", tokens: ['h', 'ob', 'w'] },
  { labelZh: '老婆的爸爸的哥哥', labelEn: "Wife's Father's Older Brother", tokens: ['w', 'f', 'ob'] },
  { labelZh: '儿子的老婆的妈妈（亲家）', labelEn: "Son's Wife's Mother", tokens: ['s', 'w', 'm'] },
];

// ==========================================
// TAB 2: Exact Age & 900-Month Life Grid (周岁/虚岁与人生 900 格)
// ==========================================
const birthDateStr = ref('1996-06-18');
const targetLifeYears = ref(75); // 75 years = 900 months

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ZODIAC_ZH = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const ZODIAC_EN = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];

function getWesternZodiac(month: number, day: number): { zh: string; en: string } {
  const table: Array<[number, number, string, string]> = [
    [1, 20, '摩羯座', 'Capricorn'],
    [2, 19, '水瓶座', 'Aquarius'],
    [3, 21, '双鱼座', 'Pisces'],
    [4, 20, '白羊座', 'Aries'],
    [5, 21, '金牛座', 'Taurus'],
    [6, 22, '双子座', 'Gemini'],
    [7, 23, '巨蟹座', 'Cancer'],
    [8, 23, '狮子座', 'Leo'],
    [9, 23, '处女座', 'Virgo'],
    [10, 24, '天秤座', 'Libra'],
    [11, 23, '天蝎座', 'Scorpio'],
    [12, 22, '射手座', 'Sagittarius'],
    [12, 31, '摩羯座', 'Capricorn'],
  ];
  for (const [m, d, zh, en] of table) {
    if (month < m || (month === m && day < d)) {
      return { zh, en };
    }
  }
  return { zh: '摩羯座', en: 'Capricorn' };
}

const ageReport = computed(() => {
  const now = new Date();
  const parts = birthDateStr.value.split('-').map(Number);
  const by = parts[0] || 1996;
  const bm = parts[1] || 6;
  const bd = parts[2] || 18;
  const birth = new Date(by, bm - 1, bd);

  let years = now.getFullYear() - by;
  let months = now.getMonth() - (bm - 1);
  let days = now.getDate() - bd;

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const chronologicalAge = Math.max(0, years);
  // Traditional East Asian age: +1 at birth, +1 after New Year
  const traditionalAge = Math.max(1, now.getFullYear() - by + 1);

  const totalDaysLived = Math.max(0, Math.floor((now.getTime() - birth.getTime()) / 86400000));
  const totalMonthsLived = Math.max(0, chronologicalAge * 12 + months);

  // Next birthday countdown
  let nextBday = new Date(now.getFullYear(), bm - 1, bd);
  if (nextBday.getTime() < now.getTime() - 86400000) {
    nextBday = new Date(now.getFullYear() + 1, bm - 1, bd);
  }
  const daysToNextBirthday = Math.max(0, Math.ceil((nextBday.getTime() - now.getTime()) / 86400000));

  const offset = (by - 1984 + 6000) % 60;
  const stemBranch = `${STEMS[offset % 10]}${BRANCHES[offset % 12]}年`;
  const zodiacZh = ZODIAC_ZH[offset % 12];
  const zodiacEn = ZODIAC_EN[offset % 12];
  const star = getWesternZodiac(bm, bd);

  const totalGridMonths = targetLifeYears.value * 12; // 900
  const percentUsed = Math.min(100, Number(((totalMonthsLived / totalGridMonths) * 100).toFixed(1)));

  return {
    chronologicalAge,
    months,
    days,
    traditionalAge,
    totalDaysLived,
    totalMonthsLived,
    daysToNextBirthday,
    stemBranch,
    zodiacZh,
    zodiacEn,
    star,
    totalGridMonths,
    percentUsed,
  };
});

function getMonthCellClass(monthIndex1Based: number): string {
  const lived = ageReport.value.totalMonthsLived;
  if (monthIndex1Based <= lived) {
    return 'is-past';
  }
  if (monthIndex1Based === lived + 1) {
    return 'is-current';
  }
  if (monthIndex1Based <= 264) {
    // 0-22 years: school
    return 'is-youth';
  }
  if (monthIndex1Based <= 720) {
    // 22-60 years: golden career
    return 'is-career';
  }
  return 'is-retire';
}
</script>

<template>
  <div class="kinship-tool-root">
    <div class="tool-card">
      <!-- Top Mode Tabs -->
      <div class="top-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="top-tab"
          :class="{ active: activeTab === 'kinship' }"
          @click="activeTab = 'kinship'"
        >
          🏮
          {{
            isEn
              ? 'Tab 1: Chinese Kinship Relationship Calculator'
              : '模式一：中国三姑六婆亲戚称呼计算器'
          }}
        </button>
        <button
          type="button"
          role="tab"
          class="top-tab"
          :class="{ active: activeTab === 'life' }"
          @click="activeTab = 'life'"
        >
          ⏳
          {{
            isEn
              ? 'Tab 2: Exact Age & 900-Month Life Grid Visualizer'
              : '模式二：精确周岁/虚岁换算 & 人生 900 个月格子图'
          }}
        </button>
      </div>

      <!-- TAB 1: Chinese Kinship Calculator -->
      <div v-if="activeTab === 'kinship'" class="kinship-workspace">
        <div class="kinship-left">
          <div class="calc-options-row">
            <div class="opt-group">
              <span class="opt-label">{{ isEn ? 'My Gender:' : '我的性别：' }}</span>
              <button
                type="button"
                class="pill-btn"
                :class="{ active: speakerGender === 'male' }"
                @click="speakerGender = 'male'"
              >
                ♂ {{ isEn ? 'Male' : '男' }}
              </button>
              <button
                type="button"
                class="pill-btn"
                :class="{ active: speakerGender === 'female' }"
                @click="speakerGender = 'female'"
              >
                ♀ {{ isEn ? 'Female' : '女' }}
              </button>
            </div>

            <div class="opt-group">
              <span class="opt-label">{{ isEn ? 'Direction:' : '称呼方向：' }}</span>
              <button
                type="button"
                class="pill-btn"
                :class="{ active: queryDirection === 'callThem' }"
                @click="queryDirection = 'callThem'"
              >
                {{ isEn ? 'What I Call Them' : '我称呼对方' }}
              </button>
              <button
                type="button"
                class="pill-btn"
                :class="{ active: queryDirection === 'callMe' }"
                @click="queryDirection = 'callMe'"
              >
                🔄 {{ isEn ? 'What They Call Me' : '对方称呼我' }}
              </button>
            </div>
          </div>

          <!-- LCD Display Screen -->
          <div class="calc-screen">
            <div class="screen-chain">
              <span class="chain-prefix">🔗 {{ isEn ? 'Relationship Chain:' : '亲属关系链：' }}</span>
              <span class="chain-expr">{{ expressionText }}</span>
            </div>

            <div class="screen-result">
              <span class="res-tag">{{ resolvedKinship.branchTagZh }}</span>
              <div class="res-main">
                {{
                  queryDirection === 'callThem'
                    ? isEn
                      ? `${resolvedKinship.zh} (${resolvedKinship.en})`
                      : resolvedKinship.zh
                    : speakerGender === 'male'
                      ? resolvedKinship.reciprocalMaleZh
                      : resolvedKinship.reciprocalFemaleZh
                }}
              </div>
              <div class="res-sub">
                <span>
                  {{ isEn ? 'Regional Aliases:' : '各地俗称/书面尊称：' }}
                  <strong>{{ resolvedKinship.aliasZh }}</strong>
                </span>
                <span>·</span>
                <span>
                  {{ isEn ? 'Reciprocal (They Call Me):' : '对方叫我：' }}
                  <strong>{{
                    speakerGender === 'male'
                      ? resolvedKinship.reciprocalMaleZh
                      : resolvedKinship.reciprocalFemaleZh
                  }}</strong>
                </span>
              </div>
            </div>
          </div>

          <!-- Calculator Keypad -->
          <div class="keypad-label">
            {{
              isEn
                ? 'Tap buttons in sequence (e.g. Father -> Mother -> Older Sister -> Son):'
                : '像按计算器一样依次点击关系（例如：父 ➔ 母 ➔ 姐 ➔ 子）：'
            }}
          </div>
          <div class="keypad-grid">
            <button
              v-for="btn in STEP_BUTTONS"
              :key="btn.token"
              type="button"
              class="key-btn"
              @click="appendStep(btn.token)"
            >
              <span class="k-big">{{ btn.shortZh }}</span>
              <span class="k-small">{{ isEn ? btn.wordEn : `的${btn.wordZh}` }}</span>
            </button>

            <button type="button" class="key-btn action-key" @click="backspaceStep">
              <span class="k-big">⌫</span>
              <span class="k-small">{{ isEn ? 'Backspace' : '退格回退' }}</span>
            </button>
            <button type="button" class="key-btn danger-key" @click="clearChain">
              <span class="k-big">AC</span>
              <span class="k-small">{{ isEn ? 'Clear All' : '清空重算' }}</span>
            </button>
          </div>
        </div>

        <!-- Right: Viral Examples & Quick Guide -->
        <div class="kinship-right">
          <h3 class="side-title">
            🔥 {{ isEn ? 'Viral Chinese New Year Kinship Puzzles' : '过年走亲戚高频烧脑称呼一键实测' }}
          </h3>
          <div class="preset-list">
            <button
              v-for="(item, idx) in VIRAL_PRESETS"
              :key="idx"
              type="button"
              class="preset-row"
              @click="chain = [...item.tokens]"
            >
              <span class="p-expr">{{ isEn ? item.labelEn : item.labelZh }}</span>
              <span class="p-arrow">测一测 →</span>
            </button>
          </div>

          <div class="cheat-box">
            <h4>📖 {{ isEn ? 'Tang (堂) vs. Biao (表) Quick Rule' : '秒懂“堂亲 vs 表亲”与“妯娌 vs 连襟”' }}</h4>
            <ul>
              <li>
                <strong>堂亲（同姓宗亲）：</strong> 爸爸的亲兄弟（伯父、叔叔）的儿女，与你同姓，称为<strong>堂哥/堂弟/堂姐/堂妹</strong>。
              </li>
              <li>
                <strong>表亲（外姓姻亲）：</strong> 爸爸的姐妹（姑妈）或妈妈的兄弟姐妹（舅舅、姨妈）的儿女，称为<strong>姑表 / 舅表 / 姨表兄妹</strong>。
              </li>
              <li>
                <strong>妯娌 vs 连襟：</strong> 兄弟两人的妻子互称<strong>妯娌</strong>（长嫂与弟媳）；姐妹两人的丈夫互称<strong>连襟</strong>（大姨夫与小姨夫）。
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- TAB 2: Exact Age & 900-Month Life Grid -->
      <div v-else class="life-workspace">
        <div class="life-input-bar">
          <label class="date-label">
            🎂 {{ isEn ? 'Select Your Date of Birth:' : '选择您的出生年月日（阳历）：' }}
            <input v-model="birthDateStr" type="date" class="date-picker" />
          </label>

          <div class="quick-years">
            <button type="button" class="year-chip" @click="birthDateStr = '1990-05-20'">90后 (1990)</button>
            <button type="button" class="year-chip" @click="birthDateStr = '1995-08-15'">95后 (1995)</button>
            <button type="button" class="year-chip" @click="birthDateStr = '2000-01-01'">00后 (2000)</button>
            <button type="button" class="year-chip" @click="birthDateStr = '2005-10-01'">05后 (2005)</button>
          </div>
        </div>

        <!-- 6 Core Age Metrics Cards -->
        <div class="age-cards-grid">
          <div class="age-card highlight">
            <span class="a-label">{{ isEn ? 'Exact Chronological Age (周岁)' : '精确法定周岁' }}</span>
            <span class="a-val">
              {{ ageReport.chronologicalAge }} <small>{{ isEn ? 'yrs' : '周岁' }}</small>
            </span>
            <span class="a-sub">
              {{
                isEn
                  ? `${ageReport.chronologicalAge}y ${ageReport.months}m ${ageReport.days}d`
                  : `零 ${ageReport.months} 个月 ${ageReport.days} 天`
              }}
            </span>
          </div>

          <div class="age-card">
            <span class="a-label">{{ isEn ? 'Traditional East Asian Age (虚岁)' : '中国传统虚岁' }}</span>
            <span class="a-val">
              {{ ageReport.traditionalAge }} <small>{{ isEn ? 'sui' : '虚岁' }}</small>
            </span>
            <span class="a-sub">{{ isEn ? '+1 at birth, +1 at New Year' : '落地一岁，过年长一岁' }}</span>
          </div>

          <div class="age-card">
            <span class="a-label">{{ isEn ? 'Chinese & Western Zodiac' : '干支生肖与星座' }}</span>
            <span class="a-val">
              {{ isEn ? ageReport.zodiacEn : `属${ageReport.zodiacZh}` }} ·
              {{ isEn ? ageReport.star.en : ageReport.star.zh }}
            </span>
            <span class="a-sub">{{ ageReport.stemBranch }}</span>
          </div>

          <div class="age-card">
            <span class="a-label">{{ isEn ? 'Days Walked on Earth' : '已来到这个世界' }}</span>
            <span class="a-val">
              {{ ageReport.totalDaysLived.toLocaleString() }} <small>{{ isEn ? 'days' : '天' }}</small>
            </span>
            <span class="a-sub">
              {{
                isEn
                  ? `Next birthday in ${ageReport.daysToNextBirthday} days`
                  : `距离下次生日还有 ${ageReport.daysToNextBirthday} 天`
              }}
            </span>
          </div>
        </div>

        <!-- 900-Month Life Grid Section -->
        <div class="grid-panel">
          <div class="grid-head">
            <div>
              <h3 class="section-title">
                ⏳
                {{
                  isEn
                    ? `Your Life in 900 Months (75 Years) — ${ageReport.totalMonthsLived} / 900 Months Lived (${ageReport.percentUsed}%)`
                    : `人生不过 900 个月（按 75 岁画布计算）— 已度过 ${ageReport.totalMonthsLived} 个格（${ageReport.percentUsed}%）`
                }}
              </h3>
              <p class="section-sub">
                {{
                  isEn
                    ? 'Each square represents 1 month of life (30 columns × 30 rows = 900 months).'
                    : '把人的一生浓缩在一张 30×30 的 A4 纸上，每 1 个小格代表 1 个月，每走完一行就是 2.5 年。'
                }}
              </p>
            </div>

            <div class="legend-bar">
              <span class="leg-item"><i class="dot past"></i> {{ isEn ? 'Lived Months' : '已度过岁月' }}</span>
              <span class="leg-item"><i class="dot current"></i> {{ isEn ? 'This Month' : '当下这一月' }}</span>
              <span class="leg-item"><i class="dot career"></i> {{ isEn ? 'Golden Years (22-60)' : '未来黄金奋斗期' }}</span>
              <span class="leg-item"><i class="dot retire"></i> {{ isEn ? 'Retirement (60-75)' : '未来退休晚年' }}</span>
            </div>
          </div>

          <div class="months-matrix">
            <div
              v-for="m in 900"
              :key="m"
              class="m-cell"
              :class="getMonthCellClass(m)"
              :title="`Month #${m} (Age ${(m / 12).toFixed(1)})`"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.kinship-tool-root {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tool-card {
  padding: 22px 24px;
  border-radius: 16px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);

  @media (max-width: 640px) {
    padding: 16px 14px;
  }
}

.top-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.top-tab {
  flex: 1;
  min-width: 240px;
  padding: 11px 16px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;

  &.active {
    background-color: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
}

.kinship-workspace {
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  gap: 20px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.calc-options-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.opt-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.opt-label {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-secondary);
}

.pill-btn {
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &.active {
    background-color: var(--accent-soft);
    border-color: var(--accent-border);
    color: var(--accent);
  }
}

.calc-screen {
  padding: 18px 20px;
  border-radius: 14px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  margin-bottom: 14px;
}

.screen-chain {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--border-color);
}

.chain-expr {
  font-weight: 700;
  color: var(--text-primary);
}

.res-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
  background-color: var(--accent-soft);
  color: var(--accent);
  margin-bottom: 6px;
}

.res-main {
  font-size: 28px;
  font-weight: 900;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.res-sub {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.keypad-label {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.keypad-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.key-btn {
  padding: 12px 8px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-muted);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--accent-border);
    background-color: var(--accent-soft);
  }

  &.action-key {
    color: var(--accent);
  }
  &.danger-key {
    color: #ef4444;
  }
}

.k-big {
  font-size: 18px;
  font-weight: 900;
}

.k-small {
  font-size: 11px;
  color: var(--text-secondary);
}

.kinship-right {
  padding: 16px 18px;
  border-radius: 14px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.side-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: var(--text-primary);
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preset-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  border-radius: 9px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-primary);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    border-color: var(--accent-border);
    color: var(--accent);
  }
}

.p-arrow {
  font-size: 11.5px;
  color: var(--accent);
}

.cheat-box {
  padding: 12px 14px;
  border-radius: 10px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  font-size: 12.5px;
  color: var(--text-secondary);

  h4 {
    margin: 0 0 8px;
    font-size: 13px;
    color: var(--text-primary);
  }

  ul {
    margin: 0;
    padding-left: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
}

.life-input-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  margin-bottom: 16px;
}

.date-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  font-weight: 800;
  color: var(--text-primary);
}

.date-picker {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-primary);
  font-size: 13.5px;
  font-weight: 700;
}

.quick-years {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.year-chip {
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    color: var(--accent);
    border-color: var(--accent-border);
  }
}

.age-cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 18px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 540px) {
    grid-template-columns: 1fr;
  }
}

.age-card {
  padding: 14px 16px;
  border-radius: 12px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 4px;

  &.highlight {
    background-color: var(--accent-soft);
    border-color: var(--accent-border);
  }
}

.a-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
}

.a-val {
  font-size: 23px;
  font-weight: 900;
  color: var(--text-primary);

  small {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-secondary);
  }
}

.a-sub {
  font-size: 12px;
  color: var(--text-secondary);
}

.grid-panel {
  padding: 18px 20px;
  border-radius: 14px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border-color);
}

.grid-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}

.section-title {
  margin: 0 0 4px;
  font-size: 15.5px;
  font-weight: 800;
  color: var(--text-primary);
}

.section-sub {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.legend-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
}

.leg-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 11px;
  height: 11px;
  border-radius: 3px;
  display: inline-block;

  &.past {
    background-color: #f97316;
  }
  &.current {
    background-color: #ef4444;
  }
  &.career {
    background-color: #10b981;
  }
  &.retire {
    background-color: #64748b;
  }
}

.months-matrix {
  display: grid;
  grid-template-columns: repeat(30, 1fr);
  gap: 4px;

  @media (max-width: 640px) {
    grid-template-columns: repeat(15, 1fr);
    gap: 3px;
  }
}

.m-cell {
  aspect-ratio: 1;
  border-radius: 3px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);

  &.is-past {
    background-color: #f97316;
    border-color: #ea580c;
  }
  &.is-current {
    background-color: #ef4444;
    border-color: #dc2626;
    transform: scale(1.22);
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.7);
  }
  &.is-youth {
    background-color: rgba(56, 189, 248, 0.25);
    border-color: rgba(56, 189, 248, 0.45);
  }
  &.is-career {
    background-color: rgba(16, 185, 129, 0.22);
    border-color: rgba(16, 185, 129, 0.42);
  }
  &.is-retire {
    background-color: rgba(100, 116, 139, 0.22);
    border-color: rgba(100, 116, 139, 0.38);
  }
}
</style>
