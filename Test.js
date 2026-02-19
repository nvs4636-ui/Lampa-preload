(function(){
  if(!window.Lampa) return;
  Lampa.Plugin.add('TestPlugin', {init:()=>console.log("Plugin OK")});
})();
