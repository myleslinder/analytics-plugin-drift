import { AnalyticsInstance } from "analytics";

type EmptyPayload = [undefined];
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
export type DriftEventPayloads = {
  ready: [
    any,
    {
      sidebarOpen: boolean;
      chatOpen: boolean;
      widgetVisible: boolean;
      isOnline: boolean;
      teamAvailability: Record<string, any>;
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

export type DriftEventName = `drift:${keyof DriftEventPayloads}`;

// | {
//     event: keyof DriftEventPayloads;
//     track: boolean;
//     trackName: string;
//   };

type DriftPluginEventHandler<K, D, P> = (arg: {
  type: K;
  instance: AnalyticsInstance;
  eventPayload: { payload: D; meta: P };
}) => void;
export type DriftPluginEventHandlers = {
  [K in keyof DriftEventPayloads]?: DriftPluginEventHandler<
    K,
    DriftEventPayloads[K][0],
    DriftEventPayloads[K][1]
  >;
};

export type DriftEventHandler<D, P> = (data: D, payload?: P) => void;

export type DriftEventHandlers = {
  [K in keyof DriftEventPayloads]?: DriftEventHandler<
    DriftEventPayloads[K][0],
    DriftEventPayloads[K][1]
  >;
};

//export type DriftEventHandler = (data: StartConversationEventPayload) => void;
declare global {
  interface Window {
    drift: {
      hasInitialized: boolean;
      SNIPPET_VERSION: string;
      identify: any;
      load: (key: string) => void;
      config: any;
      track: any;
      reset: any;
      debug: any;
      show: any;
      ping: any;
      page: any;
      hide: any;
      off: any;
      on: (
        eventName: keyof DriftEventPayloads,
        handler?: (...args: any[]) => void
      ) => void;
      api: {
        goToConversation: () => void;
        goToConversationList: () => void;
        goToNewConversation: () => void;
        hideAwayMessage: () => void;
        hideChat: () => void;
        hideWelcomeMessage: () => void;
        off: (
          e: keyof DriftEventPayloads,
          t?: (...args: any[]) => void
        ) => void;
        on: (e: keyof DriftEventPayloads, t?: (...args: any[]) => void) => void;
        openChat: () => void;
        scheduleMeeting: () => void;
        setUserAttributes: (attr: any) => void;
        showAwayMessage: () => void;
        showWelcomeMessage: () => void;
        showWelcomeOrAwayMessage: () => void;
        sidebar: { open: () => void; close: () => void; toggle: () => void };
        startInteraction: () => void;
        startVideoGreeting: () => void;
        toggleChat: () => void;
      };
      apiReady: boolean;
      chatReady: boolean;
    };
    driftt: any;
  }
}
