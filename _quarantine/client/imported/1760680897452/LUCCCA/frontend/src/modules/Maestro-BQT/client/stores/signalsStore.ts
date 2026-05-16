import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface WeatherForecast { date: string; tempF: number; precipitationChance: number; condition: string }
export interface LocalEvent { id: string; date: string; title: string; expectedAttendance: number; area?: string }

export interface SignalsState {
  occupancy: number; // total guests on property
  leisureGuests: number;
  offPropertyReservations: number; // reservations by non-staying guests
  dayOfWeekFactor: Record<number, number>; // 0-6 multipliers
  moonPhase: 'new'|'waxing'|'full'|'waning';
  weather: WeatherForecast[];
  localEvents: LocalEvent[];

  setOccupancy: (n: number) => void;
  setLeisureGuests: (n: number) => void;
  setOffPropertyReservations: (n: number) => void;
  setMoonPhase: (p: SignalsState['moonPhase']) => void;
  upsertWeather: (w: WeatherForecast) => void;
  addLocalEvent: (e: Omit<LocalEvent,'id'>) => string;
  removeLocalEvent: (id: string) => void;
}

const defaultDayOfWeek: Record<number, number> = { 0:1.1, 1:0.9, 2:0.95, 3:1.0, 4:1.05, 5:1.25, 6:1.3 };

export const useSignalsStore = create<SignalsState>()(
  devtools((set, get)=> ({
    occupancy: 350,
    leisureGuests: 120,
    offPropertyReservations: 40,
    dayOfWeekFactor: defaultDayOfWeek,
    moonPhase: 'waxing',
    weather: [],
    localEvents: [],

    setOccupancy: (n)=> set({ occupancy:n }),
    setLeisureGuests: (n)=> set({ leisureGuests:n }),
    setOffPropertyReservations: (n)=> set({ offPropertyReservations:n }),
    setMoonPhase: (p)=> set({ moonPhase: p }),
    upsertWeather: (w)=> set(s=>{ const rest=s.weather.filter(x=> x.date!==w.date); return { weather: [w, ...rest] }; }),
    addLocalEvent: (e)=>{ const id=`le-${Date.now()}`; set(s=> ({ localEvents: [{ id, ...e }, ...s.localEvents] })); return id; },
    removeLocalEvent: (id)=> set(s=> ({ localEvents: s.localEvents.filter(e=> e.id!==id) })),
  }), { name: 'signals-store' })
);

export default useSignalsStore;
