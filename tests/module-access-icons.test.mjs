import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
test('Roçadeira abre sem login e inicia leitura da planilha ao carregar',async()=>{
 const html=await readFile(new URL('sistema-rocadeira/index.html',root),'utf8');
 assert.equal(/loginScreen|loginForm|passwordInput|usernameInput|handleLogin|Acesso Restrito/.test(html),false);
 assert.match(html,/id="mainApp" class="flex min-h-screen/);
 const events={};let reads=0;
 const context=vm.createContext({tailwind:{},Chart:{register(){}},ChartDataLabels:{},document:{getElementById:()=>({})},Papa:{parse(url){assert.ok(url.includes('output=csv'));reads++;}},window:{addEventListener:(name,fn)=>events[name]=fn}});
 new vm.Script(await readFile(new URL('sistema-rocadeira/assets/js/app.js',root),'utf8')).runInContext(context);
 for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]).runInContext(context);
 assert.equal(typeof events.DOMContentLoaded,'function');events.DOMContentLoaded();assert.equal(reads,1,'Leitura é iniciada sem autenticação');
});
test('Logos e todos os arquivos das fontes dos dois sistemas são locais',async()=>{
 for(const name of ['sistema-adubacao','sistema-rocadeira']){
  const html=await readFile(new URL(name+'/index.html',root),'utf8');assert.equal(html.includes('i.imgur.com'),false);assert.ok(html.includes(name==='sistema-adubacao'?'src="logo.svg"':'src="assets/images/logo.png"'));assert.ok(html.includes('fontawesome/css/all.min.css?v=1'));
  await access(new URL(name+(name==='sistema-adubacao'?'/logo.svg':'/assets/images/logo.png'),root));
  const css=await readFile(new URL(name+'/fontawesome/css/all.min.css',root),'utf8');const fonts=[...new Set([...css.matchAll(/\.\.\/webfonts\/([^\)"']+)/g)].map(match=>match[1]))];assert.equal(fonts.length,8);
  for(const font of fonts)await access(new URL(name+'/fontawesome/webfonts/'+font,root));
  await access(new URL(name+'/fontawesome/LICENSE.txt',root));
 }
});
test('Ícones do painel são SVGs diretos e a engrenagem tem animação própria',async()=>{
 const html=await readFile(new URL('index.html',root),'utf8');assert.equal(html.includes('<use'),false);assert.ok((html.match(/viewBox="0 0 24 24"/g)||[]).length>=15);
 const gear=await readFile(new URL('icons/gear.svg',root),'utf8');assert.match(gear,/@keyframes gear-turn/);assert.match(gear,/animation:gear-turn 16s linear infinite/);assert.match(gear,/prefers-reduced-motion/);assert.ok(gear.indexOf('<rect')<gear.indexOf('<g class="gear-wheel">'));
});
