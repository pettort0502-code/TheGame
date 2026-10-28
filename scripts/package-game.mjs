import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve('dist');
let html=readFileSync(resolve(root,'index.html'),'utf8');
html=html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g,(_,path)=>'<script type="module">'+readFileSync(resolve(root,path.replace(/^\//,'')),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>');
html=html.replace(/<link rel="stylesheet" crossorigin href="([^"]+)">/g,(_,path)=>'<style>'+readFileSync(resolve(root,path.replace(/^\//,'')),'utf8')+'</style>');
const output=process.argv[2]||resolve(root,'skybound-reel-swing.html');
writeFileSync(output,html);console.log(`Standalone game written to ${output}`);
