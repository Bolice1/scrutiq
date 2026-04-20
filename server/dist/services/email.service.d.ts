declare class EmailService {
    private transporter;
    constructor();
    sendVerificationCode(email: string, code: string): Promise<void>;
    sendCustomEmail(email: string, subject: string, message: string, recruiterEmail?: string): Promise<void>;
    sendPasswordResetPin(email: string, pin: string): Promise<void>;
}
declare const _default: EmailService;
export default _default;
