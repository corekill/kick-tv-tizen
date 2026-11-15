/* The platform socket APIs may only be used in a worker. */
function report(message){self.postMessage(String(message));}
var Module={print:report,printErr:report,onAbort:function(reason){report('Abort: '+reason);}};
self.addEventListener('unhandledrejection',function(event){report(event.reason&&event.reason.stack||event.reason);});
report('Worker started. WebAssembly: '+typeof WebAssembly+'; Samsung API: '+typeof tizentvwasm);
// Samsung's 1.39.4.7 optimizer can leave these named imports undeclared.
// Supply the same dotted paths as the SDK library; its runtime checks which
// bindings exist before falling back to the Samsung JavaScript socket API.
var socketImports={accept:'accept',bind:'bind',close:'close',connect:'connect',
  getpeername:'getPeerName',getsockname:'getSockName',getsockopt:'getSockOpt',
  listen:'listen',poll:'poll',recv:'recv',recvfrom:'recvFrom',recvmsg:'recvMsg',
  select:'select',send:'send',sendmsg:'sendMsg',sendto:'sendTo',
  setsockopt:'setSockOpt',shutdown:'shutdown',socket:'create'};
Object.keys(socketImports).forEach(function(name){
  self['__wasm_'+name]='tizentvwasm.SocketsHostBindings.'+socketImports[name];
});
try{importScripts('runtime.js');}catch(error){report(error.stack||error);}
