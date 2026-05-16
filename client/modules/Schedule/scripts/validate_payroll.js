#!/usr/bin/env node
const fs = require('fs');

function validate(obj){
  const required = ['org_id','period','policy','employees','currency'];
  for (const k of required){ if (!(k in obj)) throw new Error(`Missing ${k}`); }
  if (!Array.isArray(obj.employees)) throw new Error('employees must be array');
  for (const e of obj.employees){
    for (const k of ['emp_id','first_name','last_name','reg_hours','ot_hours','dt_hours','total_hours','total_pay']){
      if (!(k in e)) throw new Error(`employee missing ${k}`);
    }
  }
}

const file = process.argv[2];
if (!file){ console.error('Usage: validate_payroll.js <weekly_totals.json>'); process.exit(1); }
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
validate(data);
console.log('OK');
