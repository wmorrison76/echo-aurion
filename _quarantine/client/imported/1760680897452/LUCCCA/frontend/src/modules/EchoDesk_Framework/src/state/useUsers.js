import { create } from 'zustand'
export const useUsers = create((set) => ({
  me: { id: 'me', name: 'You', roles: ['owner','admin'] },
  participants: [],
  policy: {
    'scheduler.hours': { roles: ['admin','owner','manager'] },
    'scheduler.employeeShifts': { roles: ['admin','owner'], summaryOnly: true },
    'finance.cost': { roles: ['admin','owner'] },
    'finance.revenue': 'all',
  },
  addParticipant(p){ set(s => ({ participants: [...s.participants, p] })) },
  updateParticipant(id, patch){ set(s => ({ participants: s.participants.map(p => p.id===id? { ...p, ...patch }: p) })) },
  removeParticipant(id){ set(s => ({ participants: s.participants.filter(p => p.id!==id) })) },
  setPolicy(policy){ set({ policy }) }
}))

export default useUsers;
