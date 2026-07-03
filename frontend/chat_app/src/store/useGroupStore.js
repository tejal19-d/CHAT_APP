import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useGroupStore = create((set, get) => ({
  groups: [],
  isGroupsLoading: false,

  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  createGroup: async (groupData) => {
    try {
      const res = await axiosInstance.post("/groups", groupData);
      set((state) => ({ groups: [...state.groups, res.data] }));
      toast.success("Group created successfully!");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
      return null;
    }
  },

  updateGroup: async (groupId, groupData) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}`, groupData);
      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? res.data : g)),
      }));
      toast.success("Group updated!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update group");
    }
  },

  deleteGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}`);
      set((state) => ({
        groups: state.groups.filter((g) => g._id !== groupId),
      }));
      toast.success("Group deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete group");
    }
  },

  addMembers: async (groupId, userIds) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/add`, { userIds });
      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? res.data : g)),
      }));
      toast.success("Members added successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add members");
    }
  },

  removeMember: async (groupId, userIdToRemove) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/remove`, { userIdToRemove });
      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? res.data : g)),
      }));
      toast.success("Member removed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
    }
  },

  leaveGroup: async (groupId) => {
    try {
      await axiosInstance.post(`/groups/${groupId}/leave`);
      set((state) => ({
        groups: state.groups.filter((g) => g._id !== groupId),
      }));
      toast.success("You left the group");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to leave group");
    }
  },

  promoteAdmin: async (groupId, userId) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/promote`, { userId });
      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? res.data : g)),
      }));
      toast.success("Promoted to admin");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to promote member");
    }
  },

  demoteAdmin: async (groupId, userId) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/demote`, { userId });
      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? res.data : g)),
      }));
      toast.success("Demoted to member");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to demote admin");
    }
  },

  transferOwnership: async (groupId, newOwnerId) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/transfer`, { newOwnerId });
      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? res.data : g)),
      }));
      toast.success("Group ownership transferred");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to transfer ownership");
    }
  },
}));
