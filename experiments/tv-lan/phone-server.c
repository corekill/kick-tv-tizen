/* Bounded, single-client transport for the TV's temporary pairing page. */
#define _GNU_SOURCE
#include <arpa/inet.h>
#include <emscripten.h>
#include <errno.h>
#include <poll.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <sys/socket.h>
#include <unistd.h>

static int listener=-1, client=-1, used, reply_size, sent, waiting;
static double deadline;
static char request[8193], reply[24576];

static void drop(void) {
    if(client>=0)close(client);
    client=-1; used=reply_size=sent=waiting=0;
}

EMSCRIPTEN_KEEPALIVE int lan_open(const char *ip) {
    struct sockaddr_in address={0};
    address.sin_family=AF_INET; address.sin_port=htons(18765);
    if(inet_pton(AF_INET,ip,&address.sin_addr)!=1)return -1;
    listener=socket(AF_INET,SOCK_STREAM|SOCK_NONBLOCK,0);
    if(listener<0)return -errno;
    int reuse=1;setsockopt(listener,SOL_SOCKET,SO_REUSEADDR,&reuse,sizeof reuse);
    if(bind(listener,(struct sockaddr *)&address,sizeof address)<0||listen(listener,4)<0){
        int reason=errno;close(listener);listener=-1;return -reason;
    }
    return 0;
}

EMSCRIPTEN_KEEPALIVE void lan_reply(int status,int html,const char *body) {
    if(client<0||!waiting||reply_size)return;
    size_t size=strlen(body); if(size>22000){status=500;html=0;body="{}";size=2;}
    int n=snprintf(reply,sizeof reply,
        "HTTP/1.1 %d %s\r\nContent-Type: %s; charset=utf-8\r\nContent-Length: %zu\r\n"
        "Connection: close\r\nCache-Control: no-store\r\nReferrer-Policy: no-referrer\r\n"
        "X-Content-Type-Options: nosniff\r\nX-Frame-Options: DENY\r\n"
        "Content-Security-Policy: default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'\r\n\r\n",
        status,status==200?"OK":"Error",html?"text/html":"application/json",size);
    if(n<=0||(size_t)n+size>sizeof reply){drop();return;}
    memcpy(reply+n,body,size);reply_size=n+size;
}

static int body_size(const char *header,const char *end) {
    int size=0,found=0;
    const char *line=strstr(header,"\r\n");
    while(line&&line<end){
        line+=2;
        if(!strncasecmp(line,"Transfer-Encoding:",18))return -1;
        if(!strncasecmp(line,"Content-Length:",15)){
            if(found++)return -1;
            const char *p=line+15;while(*p==' '||*p=='\t')p++;
            if(*p<'0'||*p>'9')return -1;
            while(*p>='0'&&*p<='9'){size=size*10+(*p++-'0');if(size>2048)return -1;}
            while(*p==' '||*p=='\t')p++;
            if(*p!='\r'||p[1]!='\n')return -1;
        }
        line=strstr(line,"\r\n");
    }
    return size;
}

EMSCRIPTEN_KEEPALIVE void lan_tick(void) {
    if(listener<0)return;
    if(client<0){
        struct pollfd p={listener,POLLIN,0};
        if(poll(&p,1,0)!=1||!(p.revents&POLLIN))return;
        client=accept4(listener,NULL,NULL,SOCK_NONBLOCK);
        if(client<0)return;
        deadline=emscripten_get_now()+3500;
    }
    if(emscripten_get_now()>deadline){drop();return;}
    if(reply_size){
        int n=send(client,reply+sent,reply_size-sent,MSG_NOSIGNAL);
        if(n>0){sent+=n;if(sent==reply_size)drop();}
        else if(n==0||(errno!=EAGAIN&&errno!=EWOULDBLOCK&&errno!=EINTR))drop();
        return;
    }
    if(waiting)return;
    int n=recv(client,request+used,sizeof request-1-used,0);
    if(n<0&&(errno==EAGAIN||errno==EWOULDBLOCK||errno==EINTR))return;
    if(n<=0||memchr(request+used,0,n)){drop();return;}
    used+=n;request[used]=0;
    char *end=strstr(request,"\r\n\r\n");
    if(!end){if(used>6144)drop();return;}
    int length=body_size(request,end),total=(int)(end+4-request)+length;
    if(length<0||total>=(int)sizeof request){drop();return;}
    if(used<total)return;
    request[total]=0;waiting=1;deadline=emscripten_get_now()+10000;
    EM_ASM({ self.handlePhoneHttp(UTF8ToString($0)); },request);
}

EMSCRIPTEN_KEEPALIVE void lan_close(void) {
    drop();if(listener>=0)close(listener);listener=-1;
}
