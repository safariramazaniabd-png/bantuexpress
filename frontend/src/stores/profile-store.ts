import { create } from "zustand";
import { identitiesApi, type Profile, type UpdateProfileData } from "@/lib/api/identities";

interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
  loadProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  setPartial: (patch: Partial<Profile>) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  isLoading: false,

  loadProfile: async () => {
    set({ isLoading: true });
    try {
      const profile = await identitiesApi.getProfile();
      set({ profile, isLoading: false });
    } catch {
      set({ profile: null, isLoading: false });
    }
  },

  updateProfile: async (data) => {
    const profile = await identitiesApi.updateProfile(data);
    set({ profile });
  },

  setPartial: (patch) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...patch } : state.profile,
    })),
}));