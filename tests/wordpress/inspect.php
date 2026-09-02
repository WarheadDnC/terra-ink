<?php
if (!hash_equals(trim(file_get_contents(__DIR__ . '/test-key.txt')), $_SERVER['HTTP_X_TEST_KEY'] ?? '')) { http_response_code(403); exit; }
require '/wordpress/wp-load.php';
if (!WC()->cart) wc_load_cart();
header('Content-Type: application/json');
$mode=$_GET['mode'] ?? 'cart';
if ($mode==='diagnose') {
    $s=Posteroom\Maps\Plugin::settings();$out=['settings'=>$s,'ABSPATH'=>ABSPATH,'docroot'=>$_SERVER['DOCUMENT_ROOT'] ?? 'unset'];
    try{$out['storage']=Posteroom\Maps\Storage::root();}catch(Throwable $e){$out['storage_error']=$e->getMessage();}
    foreach(['a3','a4'] as $size){$p=wc_get_product($s[$size]);$out[$size]=$p ? ['id'=>$p->get_id(),'type'=>$p->get_type(),'price'=>$p->get_price(),'purchasable'=>$p->is_purchasable(),'stock'=>$p->is_in_stock(),'attributes'=>$p->get_variation_attributes()] : false;}
    echo json_encode($out);exit;
}
if ($mode==='settings') {
    $s=Posteroom\Maps\Plugin::settings();
    if (isset($_POST['enabled'])) $s['enabled']=(int)$_POST['enabled'];
    if (isset($_POST['storage'])) $s['storage']=$_POST['storage'];
    update_option('posteroom_maps',$s);echo json_encode($s);exit;
}
if ($mode==='order') {
    $id=WC()->checkout()->create_order(['billing_email'=>'test@example.org','billing_first_name'=>'Local','billing_last_name'=>'Test','billing_country'=>'GR','payment_method'=>'cod']);
    if(is_wp_error($id)){echo json_encode(['error'=>$id->get_error_message()]);exit;}
    $order=wc_get_order($id);$items=[];
    foreach($order->get_items() as $item_id=>$item){$items[]=['id'=>$item_id,'name'=>$item->get_name(),'artwork'=>$item->get_meta('_posteroom_artwork'),'design'=>$item->get_meta('_posteroom_design')];}
    echo json_encode(['order'=>$id,'items'=>$items]);exit;
}
if ($mode==='admin') {
    if (!is_user_logged_in()) { wp_set_current_user(1); wp_set_auth_cookie(1); echo json_encode(['login'=>true]); exit; }
    echo json_encode(['download'=>wp_nonce_url(admin_url('admin-post.php?action=posteroom_map_download&item='.(int)$_GET['item']),'posteroom_map_download_'.(int)$_GET['item'])]);exit;
}
$items=[];foreach(WC()->cart->get_cart() as $key=>$item){$items[]=['key'=>$key,'quantity'=>$item['quantity'],'price'=>$item['data']->get_price(),'meta'=>$item['posteroom_map'] ?? null,'display'=>apply_filters('woocommerce_get_item_data',[],$item),'images'=>apply_filters('woocommerce_store_api_cart_item_images',[],$item,$key)];}
echo json_encode(['items'=>$items,'wp'=>get_bloginfo('version'),'woo'=>WC_VERSION,'php'=>PHP_VERSION,'gd'=>extension_loaded('gd')]);
