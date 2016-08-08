<?php
header( "Content-type: text/json" );
$lines = file( "game.data" );
array_push( $lines, "" ); # end with a blank line
$data = array( "nodes"=>array(), "start"=>array( "start" ), "issues"=>array() );
$current = null;
$n=0;
foreach( $lines as $line ) { 
  ++$n;
  $line = chop( $line );
  $line = trim( $line );

  $dataLine = false;
  if( preg_match( "/^([A-Z]+)\s*:\s*(.*)$/", $line, $b ) ) {
    $dataLine = true;
  }

  if( !$dataLine && $line != "" ) {
    # continuation of previous data line?
    if( $current == null ) {
      $data["issues"][] =  "Stray data! Stray data in line $n!!!: $line\n";
    } else {
      $current[$field][] = $line;
    }
    continue;
  }

  if( $dataLine ) {
    if( $current == null ) { $current = array(); }
    $field = strtolower($b[1]);
    $current[$field] = array();
    if( trim($b[2]) != "" ) { $current[$field][] = $b[2]; }
  }
    
  if( $line == "" ) {
    if( $current === null ) { continue; }
    # get this in shape
    $current["id"]=$current["id"][0];
    $current["title"]=$current["title"][0];
    $current["size"]=(@$current["size"][0]||15);
    $current["ll"]=preg_split( '/,/',$current["ll"][0] );
    $current["ll"][0]+=0; # force integer
    $current["ll"][1]+=0;
    
    if( @$current["next"][0]=="" ) {
      $current["next"]=array();
    } else {
      $current["next"]=preg_split( '/,/',$current["next"][0] );
    }

    $data["nodes"][ $current["id"] ] = $current;
    $current = null;

  }
}
print json_encode($data);
