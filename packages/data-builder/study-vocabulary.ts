import { z } from 'zod';
import { example, nonempty, provenance, type Provenance } from '../shared/content';
import { studyListIds,type StudyList } from '../shared/study-lists';
import { extractOewn } from './vocab';
import { hash } from '../../server/features/content/knowledge';

const sourceInput = z.object({ url:z.url(), sha256:z.string().regex(/^[a-f0-9]{64}$/) });
const listedWord = z.object({ lemma:nonempty,rank:z.number().int().positive(),definition:nonempty.nullable(),forms:z.array(nonempty) });
const inputsSchema = z.object({
  sources:z.object({tsl:z.array(sourceInput).min(3),ngsl:z.array(sourceInput).min(3),bsl:z.array(sourceInput).min(2),fvdp:z.array(sourceInput).min(1)}),
  lists:z.record(z.enum(studyListIds),z.array(listedWord).min(1)),
  glossary:z.record(nonempty,z.array(z.object({pos:nonempty,vi:nonempty,examples:z.array(example)}))),
});

export async function compileStudyVocabulary(input:unknown, oewnFile:string) {
  const {sources:inputs,lists,glossary} = inputsSchema.parse(input);
  const sources = [
    {id:'tsl-1.2',name:'TOEIC Service List',url:'https://www.newgeneralservicelist.com/toeic-service-list',license:'CC-BY-SA-4.0',
      attribution:'Browne, C. & Culligan, B. TOEIC Service List 1.2. Trích xếp hạng, biến thể và định nghĩa đơn giản.',sha256:inputs.tsl[0].sha256,version:'1.2'},
    {id:'ngsl-1.2',name:'New General Service List',url:'https://www.newgeneralservicelist.com/new-general-service-list',license:'CC-BY-SA-4.0',
      attribution:'Browne, C., Culligan, B. & Phillips, J. New General Service List 1.2. Trích xếp hạng, biến thể và định nghĩa đơn giản.',sha256:inputs.ngsl[0].sha256,version:'1.2'},
    {id:'bsl-1.2',name:'Business Service List',url:'https://www.newgeneralservicelist.com/business-service-list',license:'CC-BY-SA-4.0',
      attribution:'Browne, C. & Culligan, B. Business Service List 1.2. Trích xếp hạng và biến thể.',sha256:inputs.bsl[0].sha256,version:'1.2'},
    {id:'fvdp-en-vi',name:'Free Vietnamese Dictionary Project · Anh–Việt',url:'https://github.com/tecxmate/vnme-data/releases/tag/v1.0.0',license:'GPL-3.0',
      attribution:'Hồ Ngọc Đức và Free Vietnamese Dictionary Project (1997–2003), cập nhật 2004-07-01, bản đóng gói vnme-data/Underthesea. Trích nghĩa và ví dụ theo mục từ.',
      sha256:inputs.fvdp[0].sha256,version:'2004-07-01 / mirror 1.0.0'},
  ].map(value=>provenance.parse(value));
  const membership: Record<string,Partial<Record<StudyList,number>>> = Object.create(null);
  const forms: Record<string,string[]> = Object.create(null);
  for (const list of studyListIds) {
    for (const entry of lists[list]) {
      const key = entry.lemma.normalize('NFC');
      membership[key] ??= {};
      membership[key][list] ??= entry.rank;
      if (entry.forms.length) forms[key] = [...new Set([...(forms[key] ?? []),...entry.forms.filter(form=>form!==key)])];
    }
  }
  const english = await extractOewn(oewnFile,Object.keys(membership));
  const englishWords = new Set(english.map(item=>item.lemma.toLowerCase().normalize('NFC')));
  const enFallback: Record<StudyList,unknown[]> = {tsl:[],ngsl:[],bsl:[]};
  const domains:Record<StudyList,string> = {tsl:'Từ vựng TOEIC',ngsl:'Tiếng Anh thông dụng',bsl:'Tiếng Anh công việc'};
  const legacy: unknown[] = [];
  const bilingualWords = new Set<string>();
  for (const [lemma,senses] of Object.entries(glossary)) {
    if (!membership[lemma]) continue;
    for (const item of senses) {
      legacy.push({
        ...item,id:'fvdp:'+hash([lemma,item.pos,item.vi].join('\n')).slice(0,32),lemma,en:'',
        glossaryOnly:true,status:'needs_review',
        domain:domains[studyListIds.find(list=>membership[lemma][list])!],
      });
      bilingualWords.add(lemma);
    }
  }
  for (const list of studyListIds) {
    for (const {lemma,definition} of lists[list]) {
      const key = lemma.normalize('NFC');
      if (englishWords.has(key) || !definition) continue;
      enFallback[list].push({
        id:list+':'+hash(key).slice(0,32),lemma:key,pos:'unclassified',en:definition,
        domain:domains[list],status:'needs_translation',
      });
      englishWords.add(key);
    }
  }
  const authored = [
    {id:'bloom:resume-document',lemma:'résumé',pos:'noun',en:'A short document presenting qualifications and work experience for an application.',
      vi:'bản tóm tắt kinh nghiệm và năng lực dùng khi ứng tuyển',domain:'Hiring',status:'needs_review',
      examples:[{en:'Please attach your résumé to the application.',vi:'Vui lòng đính kèm hồ sơ kinh nghiệm vào đơn ứng tuyển.'},
        {en:'Maya updated her résumé before the career fair.',vi:'Maya đã cập nhật hồ sơ kinh nghiệm trước hội chợ việc làm.'}]},
    {id:'bloom:cafe-venue',lemma:'café',pos:'noun',en:'A small place that serves drinks and light meals.',
      vi:'quán cà phê, thường có đồ uống và món ăn nhẹ',domain:'Food and drink',status:'needs_review',
      examples:[{en:'The café across the street opens at seven.',vi:'Quán cà phê đối diện mở cửa lúc bảy giờ.'},
        {en:'We met at a café near the station.',vi:'Chúng tôi gặp nhau ở một quán cà phê gần nhà ga.'}]},
    {id:'bloom:stockmarket-variant',lemma:'stockmarket',pos:'noun',
      en:'A market where company shares are bought and sold. Usually written as two words: stock market.',
      vi:'thị trường chứng khoán; thường viết tách là stock market',domain:'Finance',status:'needs_review',
      collocations:['stock market index','stock market activity'],
      examples:[{en:'The company will be listed on the stock market next month.',vi:'Công ty sẽ được niêm yết trên thị trường chứng khoán vào tháng tới.'},
        {en:'The report reviews stock market activity in April.',vi:'Báo cáo tổng kết hoạt động thị trường chứng khoán trong tháng Tư.'}]},
    {id:'bloom:subprime-credit',lemma:'subprime',pos:'adjective',
      en:'Describing loans or other credit offered to borrowers judged to have a higher risk of failing to repay.',
      vi:'dưới chuẩn; dùng cho tín dụng cấp cho người vay có rủi ro trả nợ cao hơn',domain:'Finance',status:'needs_review',
      collocations:['subprime loan','subprime mortgage'],
      examples:[{en:'The lender has stopped offering subprime mortgages.',vi:'Bên cho vay đã ngừng cung cấp các khoản vay thế chấp dưới chuẩn.'},
        {en:'The audit examined the risks in the subprime loan portfolio.',vi:'Cuộc kiểm toán xem xét rủi ro trong danh mục cho vay dưới chuẩn.'}]},
    {id:'bloom:annualize-figure',lemma:'annualize',pos:'verb',
      en:'To express a figure for a shorter period as an equivalent figure for a year.',
      vi:'quy đổi một số liệu sang mức tính theo năm',domain:'Finance',status:'needs_review',
      collocations:['annualize a rate','annualized return'],
      examples:[{en:'Please annualize the monthly return before comparing the two funds.',vi:'Vui lòng quy đổi mức sinh lời tháng sang mức theo năm trước khi so sánh hai quỹ.'},
        {en:'The report shows annualized costs for both contracts.',vi:'Báo cáo trình bày chi phí quy đổi theo năm của cả hai hợp đồng.'}]},
    {id:'bloom:unauthorize-permission',lemma:'unauthorize',pos:'verb',
      en:'A rare verb for withdrawing permission previously granted. In workplace writing, revoke authorization is clearer.',
      vi:'thu hồi quyền đã cấp; động từ ít gặp, thường diễn đạt bằng revoke authorization',domain:'Office',status:'needs_review',
      collocations:['revoke authorization','unauthorized access'],
      examples:[{en:'The administrator revoked the vendor’s authorization on Friday.',vi:'Quản trị viên đã thu hồi quyền của nhà cung cấp vào thứ Sáu.'},
        {en:'The system records all attempts at unauthorized access.',vi:'Hệ thống ghi lại mọi lần truy cập trái phép.'}]},
  ].filter(item=>membership[item.lemma] && !englishWords.has(item.lemma) && !bilingualWords.has(item.lemma));
  const authoredWords = new Set(authored.map(item=>item.lemma));
  const missing = Object.keys(membership).filter(lemma=>!englishWords.has(lemma) && !bilingualWords.has(lemma) && !authoredWords.has(lemma));
  return { sources, inputs, membership, forms, english, enFallback, legacy, authored, missing };
}

export type StudyVocabularyPack = {
  sources:Provenance[];
  inputs:z.infer<typeof inputsSchema>['sources'];
  membership:Record<string,Partial<Record<StudyList,number>>>;
  forms:Record<string,string[]>;
  english:unknown[];
  enFallback:Record<StudyList,unknown[]>;
  legacy:unknown[];
  authored:unknown[];
  missing:string[];
};
