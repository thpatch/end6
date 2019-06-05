<?php
$base='https://www.thpatch.net/w/images/';
$regexp='/^lang_[a-z]+-th0[6-9]-[a-z0-9]+\.end$/i';
$loadstr=$_GET['file'] or '';
if(!preg_match($regexp,$loadstr)) {
	http_response_code(400);
	echo('Invalid file requested');
	return;
}
$digest=md5($loadstr);
$url = $base . $digest[0] . '/' . $digest[0] . $digest[1] . '/' . $loadstr;
$contents = file_get_contents($url);
if($contents === FALSE) {
	http_response_code(404);
	echo('File not found');
	return;
}
http_response_code(200);
header('Content-Type: application/octet-stream');
header('Content-Length: '.strlen($contents));
header('Content-Disposition: attachment; filename="'.$loadstr.'"');
echo($contents);
