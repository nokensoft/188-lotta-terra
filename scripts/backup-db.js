import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sqlite3 from 'sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const sourceDbPath = process.env.DB_PATH || path.join(rootDir, 'data', 'crud.sqlite')
const backupDir = process.env.BACKUP_DIR || path.join(rootDir, 'backups')

const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupFilePath =
  process.env.BACKUP_FILE || path.join(backupDir, `crud-backup-${timestamp}.sqlite`)

const escapeSqlLiteral = (value) => String(value).replace(/'/g, "''")

const runVacuumInto = (dbPath, outputPath) =>
  new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (openError) => {
      if (openError) {
        reject(openError)
        return
      }

      db.run(`VACUUM INTO '${escapeSqlLiteral(outputPath)}'`, (runError) => {
        db.close((closeError) => {
          if (runError) {
            reject(runError)
            return
          }

          if (closeError) {
            reject(closeError)
            return
          }

          resolve()
        })
      })
    })
  })

const fileExists = async (targetPath) => {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

const main = async () => {
  const dbExists = await fileExists(sourceDbPath)
  if (!dbExists) {
    throw new Error(`Database tidak ditemukan: ${sourceDbPath}`)
  }

  await fs.mkdir(path.dirname(backupFilePath), { recursive: true })
  await runVacuumInto(sourceDbPath, backupFilePath)

  console.log(`Backup database berhasil dibuat: ${backupFilePath}`)
}

main().catch((error) => {
  console.error(`Backup database gagal: ${error.message}`)
  process.exit(1)
})
