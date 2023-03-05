const DEBUG = true
const _log = (level: string, ...args: any[]) => {
    const now = new Date().toISOString()
    const msg = args.join(' ')
    console.log(`${now} [${level}] ${msg}`)
}

export const DD = (...args: any[]) => {
  if (DEBUG) _log('DEBUG', ...args)
}
export const II = (...args: any[]) => _log('INFO', ...args)
export const WW = (...args: any[]) => _log('WARN', ...args)
export const EE = (...args: any[]) => _log('ERROR', ...args)
