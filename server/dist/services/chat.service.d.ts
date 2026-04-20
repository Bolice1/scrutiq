export declare class ChatService {
    constructor();
    handleMessage(message: string, history: any[], ownerId: string): Promise<any>;
    private executeStatelessCycle;
}
declare const _default: ChatService;
export default _default;
