from pathlib import Path
import html
import subprocess,urllib.request,urllib.parse,urllib.error,http.cookiejar,json,uuid,struct,zlib,time
import os, shutil, tempfile, secrets
ROOT=Path(__file__).resolve().parents[2]
TESTS=Path(__file__).resolve().parent
BASE=Path(tempfile.mkdtemp(prefix='posteroom-woo-test-'))
(BASE/'fixtures').mkdir();(BASE/'private').mkdir()
shutil.copy2(TESTS/'inspect.php',BASE/'fixtures/inspect.php')
shutil.copy2(TESTS/'blueprint.json',BASE/'blueprint.json')
KEY=secrets.token_hex(32)
(BASE/'fixtures/test-key.txt').write_text(KEY)
CLI=os.environ.get('WP_PLAYGROUND_CLI',shutil.which('wp-playground-cli') or 'wp-playground-cli')
WOO=Path(os.environ['WOOCOMMERCE_DIR']).resolve()
PORT=int(os.environ.get('POSTEROOM_TEST_PORT','9401'))
ORIGIN=f'http://127.0.0.1:{PORT}'
def png(w,h):
 def chunk(t,d): return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress((b'\0'+b'\x12\x34\x56'*w)*h))+chunk(b'IEND',b'')
class Client:
 def __init__(self):self.jar=http.cookiejar.CookieJar();self.http=urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(self.jar))
 def request(self,path,data=None,headers=None,file=None):
  headers=dict(headers or {})
  if file is not None:
   boundary='----prm'+uuid.uuid4().hex;parts=[]
   for k,v in data.items():parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
   parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="poster"; filename="poster.png"\r\nContent-Type: image/png\r\n\r\n'.encode()+file+b'\r\n');parts.append(f'--{boundary}--\r\n'.encode());data=b''.join(parts);headers['Content-Type']='multipart/form-data; boundary='+boundary
  elif data is not None:data=urllib.parse.urlencode(data).encode()
  req=urllib.request.Request(ORIGIN+path if path.startswith('/') else path,data=data,headers=headers)
  try:r=self.http.open(req,timeout=45)
  except urllib.error.HTTPError as e:r=e
  body=r.read();return r.status,body,r.headers
 def ajax(self,data,file=None,headers=None):
  status,body,_=self.request('/wp-admin/admin-ajax.php',data,headers or {'X-Posteroom-Request':'1'},file)
  try:return status,json.loads(body)
  except:raise AssertionError((status,body[:2000]))
 def inspect(self,mode='cart',data=None):
  status,body,_=self.request('/prm-tests/inspect.php?mode='+mode,data,{'X-Test-Key':KEY});assert status==200,(status,body[:1000]);return json.loads(body)
def check(v,label):
 assert v,label
 print('PASS',label,flush=True)
cmd=[CLI,'server',f'--port={PORT}','--workers=2','--mount='+str(WOO)+':/wordpress/wp-content/plugins/woocommerce','--mount='+str(ROOT/'wordpress/posteroom-map-designer')+':/wordpress/wp-content/plugins/posteroom-map-designer','--mount='+str(BASE/'private')+':/private-artwork','--mount='+str(BASE/'fixtures')+':/wordpress/prm-tests','--blueprint='+str(BASE/'blueprint.json')]
with (BASE/'integration-server.log').open('w') as log:
 p=subprocess.Popen(cmd,stdout=log,stderr=log)
 try:
  c=Client()
  for i in range(120):
   if p.poll() is not None:raise RuntimeError((BASE/'integration-server.log').read_text()[-3000:])
   if 'Ready! WordPress' not in (BASE/'integration-server.log').read_text():
    time.sleep(1);continue
   try:
    status,config=c.ajax({'action':'posteroom_bootstrap'})
    if status==200:break
   except (urllib.error.URLError,ConnectionError,AssertionError):pass
   time.sleep(1)
  else:raise RuntimeError('WordPress did not become ready')
  check(config['success'],'session bootstrap')
  print('RUNTIME',c.inspect(),flush=True)
  print('DIAGNOSE',c.inspect('diagnose'),flush=True)
  check(config['data']['offers']['print_a4_portrait']['available'],'available configured A4 variation')
  check('16.90' in config['data']['offers']['print_a4_portrait']['label'],'server price quote')
  token=config['data']['token'];request=str(uuid.uuid4())
  design={'schemaVersion':1,'paperSize':'A4','orientation':'portrait','widthCm':21,'heightCm':29.7,'dpi':300,'title':'Θεσσαλονίκη','subtitle':'Greece','theme':'mono','latitude':40.64,'longitude':22.94}
  data={'action':'posteroom_add_to_cart','token':token,'request_id':request,'design':json.dumps(design),'price':'0.01','product_id':'1'}
  art=png(2480,3508)
  status,result=c.ajax(data,art);check(status==200 and result['success'],f'PNG upload creates real cart item: {result}')
  key=result['data']['cartItemKey']
  cart=c.inspect();check(len(cart['items'])==1 and float(cart['items'][0]['price'])==16.9,'client price/product tampering ignored')
  status,retry=c.ajax(data,art);check(status==200 and retry['data']['cartItemKey']==key,'same request returns same cart key')
  check(c.inspect()['items'][0]['quantity']==1,'retry does not increment quantity')
  changed=dict(data,design=json.dumps(dict(design,title='Athens')))
  status,result=c.ajax(changed,art);check(status==409,'same request cannot change artwork metadata')
  status,result=c.ajax(dict(data,token='wrong'),art);check(status==403,'invalid session token rejected')
  stranger=Client();status,result=stranger.ajax(data,art);check(status==403,'another session cannot reuse token')
  status,result=c.ajax(dict(data,request_id=str(uuid.uuid4())),png(100,100));check(status==400,'undersized image rejected')
  status,result=c.ajax(dict(data,request_id=str(uuid.uuid4())),b'not-a-png');check(status==400,'invalid image rejected')
  preview=cart['items'][0]['images'][0]['src'];status,body,head=stranger.request(preview)
  check(status==200 and head.get_content_type()=='image/jpeg' and len(body)>100,'signed thumbnail loads independently of customer session')
  status,body,_=stranger.request(preview+'&sig=invalid');check(status==403,'invalid thumbnail signature rejected')
  for size,orientation,w,h in [('A4','landscape',29.7,21),('A3','portrait',29.7,42),('A3','landscape',42,29.7)]:
   d=dict(design,paperSize=size,orientation=orientation,widthCm=w,heightCm=h)
   status,result=c.ajax(dict(data,request_id=str(uuid.uuid4()),design=json.dumps(d)),png(round(w/2.54*300),round(h/2.54*300)))
   check(status==200 and result['success'],f'{size} {orientation} upload/cart')
  check(len(c.inspect()['items'])==4,'four designs remain distinct cart items')
  status,body,_=c.request('/?rest_route=/wc/store/v1/cart');blocks=json.loads(body)
  check(status==200 and len(blocks.get('items',[]))==4,'Store API sees same customer cart')
  check(all('posteroom_map_preview' in x['images'][0]['src'] for x in blocks['items']),'Blocks return artwork thumbnails')
  order=c.inspect('order');check(len(order.get('items',[]))==4,f'WooCommerce creates order with four designs: {order}')
  check(all(x['artwork'] and x['design']['title']=='Θεσσαλονίκη' and x['name'].startswith('Map Poster') for x in order['items']),'order preserves artwork, Greek text and map names')
  item=order['items'][0]['id'];status,_,_=stranger.request('/wp-admin/admin-post.php?action=posteroom_map_download&item='+str(item));check(status in (302,400,403),'anonymous original download denied')
  c.inspect('admin&item='+str(item))
  admin=c.inspect('admin&item='+str(item));status,body,head=c.request(html.unescape(admin['download']))
  if status!=200 or body!=art:print('DOWNLOAD DIAGNOSTIC',status,head.get_content_type(),body[:300],flush=True)
  check(status==200 and body==art and head.get_content_type()=='image/png','shop manager downloads exact original PNG')
  check(all(json.loads((BASE/'private'/ (x['artwork']+'.json')).read_text())['ordered'] for x in order['items']),'ordered files protected from abandoned-upload cleanup')
  c.inspect('settings',{'enabled':0});status,result=c.ajax({'action':'posteroom_bootstrap'});check(not result['data']['offers']['print_a4_portrait']['available'],'ordering disabled until configured')
  c.inspect('settings',{'enabled':1,'storage':'/wordpress/public-artwork'});status,result=c.ajax({'action':'posteroom_bootstrap'});check(not result['data']['offers']['print_a4_portrait']['available'],'web-accessible storage rejected')
  print('ALL INTEGRATION CHECKS PASSED',flush=True)
 finally:
  p.terminate()
  try:p.wait(timeout=10)
  except subprocess.TimeoutExpired:p.kill()
