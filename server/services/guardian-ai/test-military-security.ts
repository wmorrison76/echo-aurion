/**
 * Test Military-Grade Security System
 */

import { masterGuardian } from './master-orchestrator';

async function test() {
  console.log('🛡️  MILITARY-GRADE SECURITY TEST SUITE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 1: Normal request
  console.log('✅ Test 1: Normal legitimate request');
  const normalResult = await masterGuardian.analyzeRequest({
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
    endpoint: '/api/recipes',
    method: 'GET',
    bytesTransferred: 1024
  });
  console.log('  Threat Level:', normalResult.threatLevel);
  console.log('  Allowed:', normalResult.allowed);
  console.log('  Actions:', normalResult.actionsTaken.length);
  console.log('');

  // Test 2: SQL Injection attempt
  console.log('🚨 Test 2: SQL Injection attempt');
  const sqlInjectionResult = await masterGuardian.analyzeRequest({
    ip: '10.0.0.50',
    userAgent: 'BadBot/1.0',
    endpoint: '/api/users',
    method: 'GET',
    queryParams: {
      id: "1 OR 1=1; DROP TABLE users--"
    },
    bytesTransferred: 512
  });
  console.log('  Threat Level:', sqlInjectionResult.threatLevel.toUpperCase());
  console.log('  Allowed:', sqlInjectionResult.allowed);
  console.log('  Blocked:', sqlInjectionResult.sentinel.blocked);
  console.log('  Attack Type:', sqlInjectionResult.sentinel.attackType);
  console.log('  Actions Taken:');
  sqlInjectionResult.actionsTaken.forEach(a => console.log('    -', a));
  console.log('');

  // Test 3: Data exfiltration attempt
  console.log('🚨 Test 3: Sensitive data exposure');
  const dataExfilResult = await masterGuardian.analyzeRequest({
    ip: '10.0.0.75',
    endpoint: '/api/export',
    method: 'POST',
    payload: {
      ssn: '123-45-6789',
      creditCard: '4111-1111-1111-1111',
      email: 'test@example.com'
    },
    bytesTransferred: 50000
  });
  console.log('  Threat Level:', dataExfilResult.threatLevel.toUpperCase());
  console.log('  Sensitive Data Detected:', dataExfilResult.aegis.hasSensitiveData);
  console.log('  Actions Taken:');
  dataExfilResult.actionsTaken.forEach(a => console.log('    -', a));
  console.log('');

  // Test 4: Rate limiting / DDoS
  console.log('🚨 Test 4: DDoS simulation (multiple requests)');
  for (let i = 0; i < 150; i++) {
    await masterGuardian.analyzeRequest({
      ip: '10.0.0.200',
      endpoint: '/api/ping',
      method: 'GET',
      bytesTransferred: 100
    });
  }

  const ddosResult = await masterGuardian.analyzeRequest({
    ip: '10.0.0.200',
    endpoint: '/api/ping',
    method: 'GET',
    bytesTransferred: 100
  });
  console.log('  Threat Level:', ddosResult.threatLevel.toUpperCase());
  console.log('  Allowed:', ddosResult.allowed);
  console.log('  Heimdall Reason:', ddosResult.heimdall.reason);
  console.log('');

  // Test 5: XSS attempt
  console.log('🚨 Test 5: XSS (Cross-Site Scripting) attempt');
  const xssResult = await masterGuardian.analyzeRequest({
    ip: '10.0.0.99',
    endpoint: '/api/comments',
    method: 'POST',
    payload: {
      comment: '<script>alert("XSS")</script>'
    },
    bytesTransferred: 200
  });
  console.log('  Threat Level:', xssResult.threatLevel.toUpperCase());
  console.log('  Allowed:', xssResult.allowed);
  console.log('  Attack Type:', xssResult.sentinel.attackType);
  console.log('');

  // Dashboard stats
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SECURITY DASHBOARD');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const stats = masterGuardian.getDashboardStats();
  console.log('\nNetwork Stats:');
  console.log('  Total IPs:', stats.network.totalIPs);
  console.log('  Blocked IPs:', stats.network.blockedIPs);
  console.log('  Suspicious IPs:', stats.network.suspiciousIPs);
  console.log('  Total Requests:', stats.network.totalRequests);
  console.log('  Requests/sec:', stats.network.requestsPerSecond.toFixed(2));

  console.log('\nIncident Stats:');
  console.log('  Total Incidents:', stats.incidents.total);
  console.log('  Active:', stats.incidents.active);
  console.log('  Escalated:', stats.incidents.escalated);
  console.log('  Resolved:', stats.incidents.resolved);

  if (stats.activeIncidents.length > 0) {
    console.log('\n⚠️  Active Security Incidents:');
    stats.activeIncidents.forEach((incident: { attackType: string; threatLevel: string; ipAddress: string; actionsTaken: unknown[] }, i: number) => {
      console.log(`  ${i + 1}. ${incident.attackType} - Severity: ${incident.threatLevel}`);
      console.log(`     IP: ${incident.ipAddress}`);
      console.log(`     Actions: ${incident.actionsTaken.length}`);
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ MILITARY-GRADE SECURITY TEST COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

test();
