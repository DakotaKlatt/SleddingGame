import { io, Socket } from 'socket.io-client';

class SocketClient {
    private socket: Socket;
    private static instance: SocketClient;

    private constructor() {
        this.socket = io('/', {
            autoConnect: false // Connect explicitly when needed or on boot
        });
    }

    public static getInstance(): SocketClient {
        if (!SocketClient.instance) {
            SocketClient.instance = new SocketClient();
        }
        return SocketClient.instance;
    }

    public connect() {
        if (!this.socket.connected) {
            this.socket.connect();
        }
    }

    public on(event: string, callback: (...args: any[]) => void) {
        this.socket.on(event, callback);
    }

    public once(event: string, callback: (...args: any[]) => void) {
        this.socket.once(event, callback);
    }

    public off(event: string) {
        this.socket.off(event);
    }

    public emit(event: string, data?: any) {
        this.socket.emit(event, data);
    }

    public get id() {
        return this.socket.id;
    }
}

export default SocketClient.getInstance();
