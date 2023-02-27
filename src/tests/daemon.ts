
// Generals ===============================================
import path from 'path'
import cp from 'child_process'

function wait(time: number) {
    return new Promise<void>(resolve => {
        setTimeout(resolve, time)
    })
}

// DEAMON =================================================

export async function createBFF(script: string) {
    const child = cp.spawn(`node`, [path.join(__dirname, script)], { stdio: 'inherit' })
    await wait(2000)
    return () => new Promise<void>((resolve) => {
        child.on('exit', () => resolve())
        child.kill()
    })
}