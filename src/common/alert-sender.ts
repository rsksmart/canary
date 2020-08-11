import { getLogger, Logger } from "log4js";
import nodemailer from "nodemailer";
import { CerebrusConfig } from "./cerebrus";
import { ForkEmail } from "./models/forkEmail";

export interface AlertSender {
    sendAlert(email: ForkEmail, recipients: string[]): Promise<void>;
}

export class MailAlertSender implements AlertSender {
    private config: CerebrusConfig;
    private logger: Logger;
    
    constructor(config: CerebrusConfig) {
        this.config = config;
        this.logger = getLogger('mail-alert-sender');
    }

    async sendAlert(email: ForkEmail, recipients: string[]): Promise<void> {
        const options = {
            host: this.config.server,
            auth: {
                user: this.config.user,
                pass: this.config.pass
            }
        };

        const transport = nodemailer.createTransport(options);
        
        let emailConf = {
            from: this.config.sender,
            to: recipients,
            subject: email.subject,
            text: email.body
        }

        this.logger.info(`Email configuration: ${emailConf}`)

        let info = await transport.sendMail(emailConf);

        this.logger.info(`Sent message: ${info.messageId}`)
        this.logger.debug(`Subject: ${email.subject}`)
        this.logger.debug(`Body: ${email.body}`)
    }
}