/** @param {string} text */
export function redactPII(text) {
  const boundary = '(?=$|[\\s，,。.!！?？、]|想|要|在|今年)';
  text = text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[邮箱]')
    .replace(/(?<!\d)(?:\+?86[ -]*)?1[3-9](?:[ -]*\d){9}(?!\d)/g, '[电话]')
    .replace(/(?<!\d)0\d{2,3}-?\d{7,8}(?!\d)/g, '[电话]')
    .replace(/(?<!\d)(?:\d{6}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]|\d{6}\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3})(?!\d)/g, '[证件号]')
    .replace(/(?:QQ|微信号?|vx|wx)\s*(?:号码|号)?\s*(?:是|为|[:：])?\s*[A-Za-z0-9_-]{3,}/gi, '[账号]')
    .replace(/(?<!\d)\d(?:[ -]*\d){15,18}(?![ -]*\d)/g, '[号码]')
    .replace(/[\p{Script=Han}]{1,10}(?:路|街|大道|巷|弄)\s*\d+号(?:\s*\d+(?:栋|幢|号楼|单元|室))*/gu, '[地址]')
    .replace(/([\p{Script=Han}]{2,8})小区(?:\s*\d+(?:栋|幢|号楼)\s*(?:\d+单元\s*)?\d+(?:室|号)?|\s*\d+单元\s*\d+(?:室|号))?/gu, (whole, prefix) => {
      const lead=prefix.match(/^(?:这个|那个|一个|某个|每个|哪个|这|那|某|每|各)/)?.[0] ?? '';
      return prefix.length-lead.length>=2 ? lead+'[地址]' : whole;
    })
    .replace(/\d+(?:栋|幢|号楼)\s*(?:\d+单元\s*)?\d+(?:室|号)?|\d+单元\s*\d+(?:室|号)|(?<!\d)\d{3,4}室/g, '[地址]')
    .replace(/(住在|住址是|家住|家在|我家在)\s*([\p{Script=Han}\d]{2,12}?)(?=$|[\s，,。.!！?？、])|(住在|住址是|家住|家在|我家在)\s*[\p{Script=Han}\d]{2,12}/gu, (_, lead, value, other) => (lead || other)+'[地址]');
  text = text.replace(/(?:QQ|微信号?|vx|wx)\s*(?:号码|号)?\s*(?:是|为|[:：])\s*([\p{Script=Han}]{2,12})(?=$|[\s，,。.!！?？、])/giu, (whole,nickname) => /^(?:什么|怎么|哪|多少|不是|否)/u.test(nickname) ? whole : '[账号]');
  text = text.replace(/我是([\p{Script=Han}]{2,4}?)(?=同学)/gu, (whole,name) => /年级|^新$|^你的$|^[一二三四五六七八九十]/u.test(name) ? whole : '我是[名字]');
  text = text.replace(new RegExp('(我叫|我的名字是|名字是|名字叫)\\s*([A-Za-z]{1,20}|[\\p{Script=Han}]{1,4}?'+boundary+'|[\\p{Script=Han}]{2,4})','gu'),
    (whole, lead, name) => /^(?:什么|怎么|哪|多少)/u.test(name) ? whole : lead+'[名字]');
  text = text.replace(new RegExp('我是([\\p{Script=Han}]{2,3}?)'+boundary,'gu'),
    (whole, name) => /年级|学生|家长|老师|用户|妈妈|爸爸|孩子|新手|同学|小朋友|^[\d一二三四五六七八九十]/u.test(name) ? whole : '我是[名字]');
  return text.replace(/([\p{Script=Han}]{0,8})(小学|中学|学校|附小|附中)/gu, (whole, prefix, suffix) => {
    const stop=/[我你他她们想学上读念在的是个了要去这那哪就也都还会能到从级初高]/gu;
    let start=0;
    for(const match of prefix.matchAll(stop)) start=match.index+1;
    return prefix.length-start>=2 ? prefix.slice(0,start)+'[学校]' : whole;
  });
}
