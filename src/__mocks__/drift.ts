import { jest } from "@jest/globals";
import { Drift, DriftInstance } from "~/types/drift";

const EmptyPayload = [undefined];
const CampaignPayload = [
  {
    data: {
      widgetVisible: false,
      isOnline: false,
    },
    campaignId: 1,
  },
];
const SliderMessagePayload = [
  {
    botMessage: false,
    playbookId: 1,
    interactionId: 1,
    campaignId: 1,
  },
];
const ConversationBasePayload = {
  conversationId: 1,
  playbookId: 1,
  interactionId: 1,
  campaignId: 1,
};
export const DriftEventPayloads = {
  ready: [
    {},
    {
      sidebarOpen: false,
      chatOpen: false,
      widgetVisible: false,
      isOnline: false,
      teamAvailability: {},
    },
  ],
  chatOpen: EmptyPayload,
  chatClose: EmptyPayload,
  "welcomeMessage:open": EmptyPayload,
  "welcomeMessage:close": EmptyPayload,
  "awayMessage:open": EmptyPayload,
  "awayMessage:close": EmptyPayload,
  "campaign:open": CampaignPayload,
  "campaign:dismiss": CampaignPayload,
  "campaign:click": CampaignPayload,
  "campaign:submit": CampaignPayload,
  "sliderMessage:close": SliderMessagePayload,
  startConversation: [
    {
      conversationId: 1,
      inboxId: 1,
    },
  ],
  "conversation:selected": [ConversationBasePayload],
  "conversation:buttonClicked": [
    {
      messageId: 1,
      createdAt: 1,
      authorId: 1,
      questionId: 1,
      buttonBody: "string",
      conversationId: 1,
      playbookId: 1,
      interactionId: 1,
      campaignId: 1,
    },
  ],
  message: [
    {
      conversationId: 1,
      playbookId: 1,
      interactionId: 1,
      campaignId: 1,
      inboxId: 1,
      teamMember: {
        id: 1,
        name: "string",
      },
    },
  ],
  "message:sent": [
    {
      conversationId: 1,
      playbookId: 1,
      interactionId: 1,
      campaignId: 1,
      inboxId: 1,
    },
  ],
  emailCapture: [
    {
      conversationId: 1,
      playbookId: 1,
      interactionId: 1,
      campaignId: 1,
      data: {
        email: "string",
      },
    },
  ],
  phoneCapture: [
    {
      conversationId: 1,
      playbookId: 1,
      interactionId: 1,
      campaignId: 1,
      messageId: 1,
      createdAt: 1,
      authorId: 1,
      phone: "string",
    },
  ],
  "scheduling:requestMeeting": [
    {
      teamMember: {
        id: 1,
        name: "string",
      },
    },
  ],
  "scheduling:meetingBooked": [
    {
      teamMember: {
        id: 1,
        name: "string",
      },
      meeting: {
        time: "string",
        duration: 1,
        timeZone: "string",
      },
      conversationId: 1,
      playbookId: 1,
      interactionId: 1,
      campaignId: 1,
    },
  ],
  "conversation:playbookFired": [
    {
      messageId: 1,
      createdAt: 1,
      authorId: 1,
      conversationId: 1,
      playbookId: 1,
      interactionId: 1,
      campaignId: 1,
    },
  ],
  "conversation:playbookClicked": [ConversationBasePayload],
  "conversation:playbookDismissed": [
    {
      messageId: 1,
      conversationId: 1,
      playbookId: 1,
      interactionId: 1,
      campaignId: 1,
    },
  ],
  "conversation:firstInteraction": [
    {
      messageId: 1,
      createdAt: 1,
      authorId: 1,
      conversationId: 1,
      playbookId: 1,
      interactionId: 1,
      campaignId: 1,
    },
  ],
  gdprClicked: [
    {
      accepted: false,
      endUser: 1,
    },
  ],
};

export const registeredHandlers: {
  [K in keyof Drift.EventPayloads]?: (() => void)[];
} = {};

const driftmock: DriftInstance = {
  hasInitialized: false,
  SNIPPET_VERSION: "",
  identify: jest.fn(
    (
      _userId: string,
      _attributes: Record<string, unknown>,
      _jwt?: { jwt: string }
    ) => undefined
  ),
  load: (_: string) => undefined,
  config: {},
  track: jest.fn(
    (_eventName: string, _properties: Record<string, unknown>) => undefined
  ),
  reset: () => undefined,
  debug: false,
  show: () => undefined,
  ping: () => undefined,
  page: jest.fn(() => undefined),
  hide: () => undefined,
  off: jest.fn(),
  on: jest.fn(),
  api: {
    goToConversation: () => undefined,
    goToConversationList: () => undefined,
    goToNewConversation: () => undefined,
    hideAwayMessage: () => undefined,
    hideChat: () => undefined,
    hideWelcomeMessage: () => undefined,
    off: <K extends keyof Drift.EventPayloads>(
      _eventName: K,
      _handler: (
        apiOrData: Drift.EventPayloads[K][0],
        payload: Drift.EventPayloads[K][1]
      ) => void
    ) => undefined,
    on: <K extends keyof Drift.EventPayloads>(
      _eventName: K,
      _handler: (
        apiOrData: Drift.EventPayloads[K][0],
        payload: Drift.EventPayloads[K][1]
      ) => void
    ) => undefined,
    openChat: () => undefined,
    scheduleMeeting: () => undefined,
    setUserAttributes: jest.fn(
      (_attributes: Record<string, unknown>) => undefined
    ),
    showAwayMessage: () => undefined,
    showWelcomeMessage: () => undefined,
    showWelcomeOrAwayMessage: () => undefined,
    sidebar: {
      open: () => undefined,
      close: () => undefined,
      toggle: () => undefined,
    },
    startInteraction: () => undefined,
    startVideoGreeting: () => undefined,
    toggleChat: () => undefined,
  },
  apiReady: false,
  chatReady: false,
};
driftmock.load = jest.fn(
  function (this: DriftInstance, _: string) {
    this.hasInitialized = true;
  }.bind(driftmock)
);

export const clearMocks = () => {
  jest.clearAllMocks();
};
export const buildDriftMock = () => {
  return { ...driftmock };
};
