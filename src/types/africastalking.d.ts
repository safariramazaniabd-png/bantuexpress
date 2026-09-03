declare module 'africastalking' {
  interface AfricasTalkingOptions {
    apiKey?: string;
    username: string;
    sandbox?: boolean;
  }

  interface SmsSendOptions {
    to: string[];
    message: string;
    from?: string;
  }

  interface Sms {
    send(options: SmsSendOptions): Promise<any>;
  }

  interface AfricasTalkingInstance {
    SMS: Sms;
  }

  function AfricasTalking(options: AfricasTalkingOptions): AfricasTalkingInstance;
  export default AfricasTalking;
}
