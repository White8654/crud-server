import { NextResponse } from 'next/server';
import os from 'os';

type HealthcheckData = {
  status: string;
  timestamp: string;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  loadAverage: number[];
  cpuUsage: { user: string; system: string };
 
  environment: 'development' | 'production' | 'test';
  application: { version: string; name: string };
  
};

export async function GET() {
  const healthcheckData: HealthcheckData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: os.uptime(),
    memoryUsage: process.memoryUsage(),
    loadAverage: os.loadavg(),
    cpuUsage: await getCPUUsage(),
  
    environment: process.env.NODE_ENV as 'development' | 'production' | 'test',
    application: {
      version: process.env.npm_package_version || 'unknown',
      name: process.env.npm_package_name || 'unknown',
    },
   
  };

  return NextResponse.json(healthcheckData, { status: 200 });
}

async function getCPUUsage() {
  const start = process.cpuUsage();
  await new Promise(resolve => setTimeout(resolve, 100));
  const end = process.cpuUsage(start);
  return {
    user: (end.user / 1000).toFixed(2) + ' ms',
    system: (end.system / 1000).toFixed(2) + ' ms',
  };
}

