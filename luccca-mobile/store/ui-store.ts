import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
}

export interface ModalState {
  isOpen: boolean;
  type?: string;
  data?: any;
}

export interface UIState {
  isLoading: boolean;
  isOffline: boolean;
  toasts: ToastMessage[];
  modals: {
    eventDetails: ModalState;
    createEvent: ModalState;
    settings: ModalState;
    integrations: ModalState;
  };
  selectedDate: string | null;
  selectedEventId: string | null;
  syncInProgress: boolean;

  setLoading: (isLoading: boolean) => void;
  setOffline: (isOffline: boolean) => void;
  showToast: (
    message: string,
    type?: "success" | "error" | "info" | "warning",
    duration?: number,
  ) => void;
  closeToast: (id: string) => void;
  openModal: (modalType: keyof UIState["modals"], data?: any) => void;
  closeModal: (modalType: keyof UIState["modals"]) => void;
  setSelectedDate: (date: string | null) => void;
  setSelectedEventId: (eventId: string | null) => void;
  setSyncInProgress: (inProgress: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      isOffline: false,
      toasts: [],
      modals: {
        eventDetails: { isOpen: false },
        createEvent: { isOpen: false },
        settings: { isOpen: false },
        integrations: { isOpen: false },
      },
      selectedDate: null,
      selectedEventId: null,
      syncInProgress: false,

      setLoading: (isLoading) => set({ isLoading }),

      setOffline: (isOffline) => set({ isOffline }),

      showToast: (message, type = "info", duration = 3000) => {
        const id = Date.now().toString();
        const toast: ToastMessage = { id, type, message, duration };

        set((state) => ({
          toasts: [...state.toasts, toast],
        }));

        if (duration) {
          setTimeout(() => {
            get().closeToast(id);
          }, duration);
        }
      },

      closeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },

      openModal: (modalType, data) => {
        set((state) => ({
          modals: {
            ...state.modals,
            [modalType]: {
              isOpen: true,
              type: modalType,
              data,
            },
          },
        }));
      },

      closeModal: (modalType) => {
        set((state) => ({
          modals: {
            ...state.modals,
            [modalType]: {
              isOpen: false,
              type: undefined,
              data: undefined,
            },
          },
        }));
      },

      setSelectedDate: (date) => set({ selectedDate: date }),

      setSelectedEventId: (eventId) => set({ selectedEventId: eventId }),

      setSyncInProgress: (inProgress) => set({ syncInProgress: inProgress }),
    }),
    {
      name: "ui-store",
      partialize: (state) => ({
        selectedDate: state.selectedDate,
      }),
    },
  ),
);
