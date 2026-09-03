import { apiClient } from "@/lib/api-client";

export interface Profile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  gender: string | null;
  birthDate: string | null;
  profession: string | null;
  languages: string[];
  secondaryPhones: string[];
  identityDocumentType: string | null;
  identityDocumentNumber: string | null;
  identityDocumentPhoto: string | null;
  digitalSignature: string | null;
  verifiedAt: string | null;
  personalQrCode: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfileData {
  firstName: string;
  lastName: string;
  gender?: string;
  birthDate?: string;
  profession?: string;
  languages?: string[];
  secondaryPhones?: string[];
  identityDocumentType?: string;
  identityDocumentNumber?: string;
  isPublic?: boolean;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  gender?: string;
  birthDate?: string;
  profession?: string;
  languages?: string[];
  secondaryPhones?: string[];
  identityDocumentType?: string;
  identityDocumentNumber?: string;
  isPublic?: boolean;
  digitalSignature?: string;
}

export const identitiesApi = {
  getProfile: () => apiClient.get<Profile>("/identities/profile"),

  createProfile: (data: CreateProfileData) =>
    apiClient.post<Profile>("/identities/profile", data),

  updateProfile: (data: UpdateProfileData) =>
    apiClient.patch<Profile>("/identities/profile", data),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post<{ avatarUrl: string }>("/identities/profile/avatar", form);
  },

  deleteAvatar: () =>
    apiClient.delete<{ message: string }>("/identities/profile/avatar"),

  generateQrCode: (force = false) =>
    apiClient.post<{ personalQrCode: string }>(
      `/identities/profile/qrcode${force ? "?force=true" : ""}`,
    ),

  verifyProfile: () =>
    apiClient.post<Profile>("/identities/profile/verify"),

  uploadIdentityDocument: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post<{ identityDocumentPhoto: string }>(
      "/identities/profile/identity-document",
      form,
    );
  },

  uploadSignature: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post<{ digitalSignature: string }>(
      "/identities/profile/signature",
      form,
    );
  },

  getPublicProfile: (userId: string) =>
    apiClient.get<Profile>(`/identities/${userId}`),
};
