import type { Currency, WeeklyTotals } from "../../../types/payroll";

import type { Currency, WeeklyTotals } from '@shared/payroll';

export function applyPolicy({ daily, baseRate, currency, policy }:{ daily:number[]; baseRate:number; currency:Currency; policy: WeeklyTotals['policy']}){
  const components: { kind: 'regular'|'overtime'|'doubletime'; hours:number; rate:number; amount:number }[] = [];
  let reg=0, ot=0, dt=0; let weeklyHours=0;

  for (const h of daily){
    let rem = h;
    const dtThresh = policy.dt_threshold ?? Infinity;
    const dailyOT = policy.daily_ot_threshold ?? Infinity;
    if (rem > dtThresh){
      const dth = rem - dtThresh; rem -= dth; dt += dth; components.push({ kind:'doubletime', hours:dth, rate: baseRate*policy.dt_multiplier, amount: dth*baseRate*policy.dt_multiplier });
    }
    if (rem > dailyOT){
      const oth = rem - dailyOT; rem -= oth; ot += oth; components.push({ kind:'overtime', hours:oth, rate: baseRate*policy.ot_multiplier, amount: oth*baseRate*policy.ot_multiplier });
    }
    if (rem>0){ reg += rem; components.push({ kind:'regular', hours: rem, rate: baseRate, amount: rem*baseRate }); }
    weeklyHours += h;
  }

  // Weekly OT over threshold moves from reg to ot at multiplier difference
  if (weeklyHours > policy.weekly_ot_threshold){
    const extra = weeklyHours - policy.weekly_ot_threshold;
    const shift = Math.min(extra, reg);
    reg -= shift; ot += shift;
    // adjust components: convert last reg chunks to ot rate
    let remaining = shift;
    for (let i=components.length-1;i>=0 && remaining>0;i--){
      const c = components[i];
      if (c.kind==='regular'){
        const take = Math.min(c.hours, remaining);
        c.hours -= take; c.amount -= take*c.rate; remaining -= take;
        components.splice(i+1,0,{ kind:'overtime', hours: take, rate: baseRate*policy.ot_multiplier, amount: take*baseRate*policy.ot_multiplier });
      }
    }
  }

  const totalPay = components.reduce((s,c)=> s+c.amount, 0);
  const totalHours = reg+ot+dt;
  return { reg, ot, dt, totalPay, totalHours, components };
}
