/* One-shot Samsung WASM ingress check, not part of the release package. */
#include <arpa/inet.h>
#include <errno.h>
#include <poll.h>
#include <stdio.h>
#include <string.h>
#include <sys/socket.h>
#include <unistd.h>

static int wait_for(int fd, short events, int milliseconds) {
    struct pollfd p = {fd, events, 0};
    return poll(&p, 1, milliseconds) == 1 && (p.revents & events);
}

int main(void) {
    setvbuf(stdout, NULL, _IONBF, 0);
    puts("TV LAN test: opening a socket.");
    struct sockaddr_in address = {0};
    int listener = socket(AF_INET, SOCK_STREAM, 0);
    if (listener < 0) { printf("socket: %s (%d)\n", strerror(errno), errno); return 1; }
    address.sin_family = AF_INET;
    address.sin_port = htons(18765);
    address.sin_addr.s_addr = htonl(INADDR_ANY);
    if (bind(listener, (struct sockaddr *)&address, sizeof address) != 0) {
        printf("bind: %s (%d)\n", strerror(errno), errno); close(listener); return 1;
    }
    if (listen(listener, 1) != 0) {
        printf("listen: %s (%d)\n", strerror(errno), errno); close(listener); return 1;
    }
    puts("Listening on port 18765 for up to 30 seconds.");
    fflush(stdout);
    if (!wait_for(listener, POLLIN, 30000)) { puts("No incoming connection within 30 seconds, or poll failed."); close(listener); return 2; }
    int client = accept(listener, NULL, NULL);
    close(listener);
    if (client < 0) { printf("accept: %s (%d)\n", strerror(errno), errno); return 1; }
    char request[1024];
    int ok = 0;
    if (wait_for(client, POLLIN, 1500) && recv(client, request, sizeof request, 0) > 0) {
        static const char response[] = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n"
                                       "Content-Length: 12\r\nConnection: close\r\n\r\nTV listener\n";
        ok = send(client, response, sizeof response - 1, MSG_NOSIGNAL) == sizeof response - 1;
    }
    close(client);
    puts(ok ? "HTTP response sent." : "Client connected but no HTTP response was sent.");
    return ok ? 0 : 1;
}
