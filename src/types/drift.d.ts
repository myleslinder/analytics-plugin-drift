type EmptyPayload = [void];
type CampaignPayload = [
  {
    data: {
      widgetVisible: boolean;
      isOnline: boolean;
    };
    campaignId: number;
  }
];
type SliderMessagePayload = [
  {
    botMessage: boolean;
    playbookId?: number;
    interactionId?: number;
    campaignId?: number;
  }
];
type ConversationBasePayload = {
  conversationId: number;
  playbookId?: number;
  interactionId?: number;
  campaignId?: number;
};
type DriftEventPayloads = {
  ready: [
    DriftInstance["api"],
    {
      sidebarOpen: boolean;
      chatOpen: boolean;
      widgetVisible: boolean;
      isOnline: boolean;
      teamAvailability: Record<string, unknown>;
    }
  ];
  chatOpen: EmptyPayload;
  chatClose: EmptyPayload;
  "welcomeMessage:open": EmptyPayload;
  "welcomeMessage:close": EmptyPayload;
  "awayMessage:open": EmptyPayload;
  "awayMessage:close": EmptyPayload;
  "campaign:open": CampaignPayload;
  "campaign:dismiss": CampaignPayload;
  "campaign:click": CampaignPayload;
  "campaign:submit": CampaignPayload;
  "sliderMessage:close": SliderMessagePayload;
  startConversation: [
    {
      conversationId: number;
      inboxId: number;
    }
  ];
  "conversation:selected": [ConversationBasePayload];
  "conversation:buttonClicked": [
    {
      messageId: number;
      createdAt: number;
      authorId: number;
      questionId: number;
      buttonBody: string;
    } & ConversationBasePayload
  ];
  message: [
    {
      inboxId: number;
      teamMember: {
        id: number;
        name: string;
      };
    } & ConversationBasePayload
  ];
  "message:sent": [
    {
      inboxId: number;
    } & ConversationBasePayload
  ];
  emailCapture: [
    {
      data: {
        email: string;
      } & ConversationBasePayload;
    }
  ];
  phoneCapture: [
    {
      messageId: number;
      createdAt: number;
      authorId: number;
      phone: string;
    } & ConversationBasePayload
  ];
  "scheduling:requestMeeting": [
    {
      teamMember: {
        id: number;
        name: string;
      };
    }
  ];
  "scheduling:meetingBooked": [
    {
      teamMember: {
        id: number;
        name: string;
      };
      meeting: {
        time: string;
        duration: number;
        timeZone: string;
      };
    } & ConversationBasePayload
  ];
  "conversation:playbookFired": [
    {
      messageId: number;
      createdAt: number;
      authorId: number;
    } & ConversationBasePayload
  ];
  "conversation:playbookClicked": [ConversationBasePayload];
  "conversation:playbookDismissed": [
    { messageId: number } & ConversationBasePayload
  ];
  "conversation:firstInteraction": [
    {
      messageId: number;
      createdAt: number;
      authorId: number;
    } & ConversationBasePayload
  ];
  gdprClicked: [
    {
      accepted: boolean;
      endUser: number;
    }
  ];
};

type DriftInstance = {
  hasInitialized: boolean;
  SNIPPET_VERSION: string;
  identify: (
    userId: string,
    attributes: Record<string, unknown>,
    jwt?: { jwt: string }
  ) => void;
  load: (key: string) => void;
  config: unknown;
  track: (eventName: string, properties: Record<string, unknown>) => void;
  reset: () => void;
  debug: boolean;
  show: () => void;
  ping: () => void;
  page: () => void;
  hide: () => void;
  off: <K extends keyof DriftEventPayloads>(
    eventName: K,
    handler: (
      apiOrData: DriftEventPayloads[K][0],
      payload: DriftEventPayloads[K][1]
    ) => void
  ) => void;
  on: <K extends keyof DriftEventPayloads>(
    eventName: K,
    handler: (
      apiOrData: DriftEventPayloads[K][0],
      payload: DriftEventPayloads[K][1]
    ) => void
  ) => void;
  api: {
    goToConversation: () => void;
    goToConversationList: () => void;
    goToNewConversation: () => void;
    hideAwayMessage: () => void;
    hideChat: () => void;
    hideWelcomeMessage: () => void;
    off: <K extends keyof DriftEventPayloads>(
      eventName: K,
      handler: (
        apiOrData: DriftEventPayloads[K][0],
        payload: DriftEventPayloads[K][1]
      ) => void
    ) => void;
    on: <K extends keyof DriftEventPayloads>(
      eventName: K,
      handler: (
        apiOrData: DriftEventPayloads[K][0],
        payload: DriftEventPayloads[K][1]
      ) => void
    ) => void;
    openChat: () => void;
    scheduleMeeting: () => void;
    setUserAttributes: (attributes: Record<string, unknown>) => void;
    showAwayMessage: () => void;
    showWelcomeMessage: () => void;
    showWelcomeOrAwayMessage: () => void;
    sidebar: {
      open: () => void;
      close: () => void;
      toggle: () => void;
    };
    startInteraction: () => void;
    startVideoGreeting: () => void;
    toggleChat: () => void;
  };
  apiReady: boolean;
  chatReady: boolean;
};

export namespace Drift {
  export type Instance = DriftInstance;
  export type EventPayloads = DriftEventPayloads;
}
