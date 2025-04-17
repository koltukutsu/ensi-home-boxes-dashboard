declare module '@mailchimp/mailchimp_marketing' {
  interface MailchimpConfig {
    apiKey: string;
    server: string;
  }

  interface MergeFields {
    [key: string]: string;
  }

  interface ListMemberRequest {
    email_address: string;
    status: string;
    merge_fields?: MergeFields;
  }

  interface Lists {
    addListMember: (listId: string, data: ListMemberRequest) => Promise<any>;
    getListMember: (listId: string, subscriberHash: string) => Promise<any>;
  }

  const lists: Lists;
  
  function setConfig(config: MailchimpConfig): void;

  export { setConfig, lists };
} 