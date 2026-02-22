import Job from '#models/job'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'

export default class DatabaseQueue {
    /**
     * Push a new job onto the queue.
     */
    static async push(queueName: string, payload: any, delaySeconds: number = 0) {
        const availableAt = DateTime.now().plus({ seconds: delaySeconds })

        const job = new Job()
        job.queue = queueName
        job.payload = payload
        job.attempts = 0
        job.maxAttempts = 3 // default retries
        job.availableAt = availableAt
        await job.save()

        logger.debug(`[Queue] Job pushed to ${queueName} queue (ID: ${job.id})`)
        return job
    }

    /**
     * Get the next available job from the queue and remove it from the table.
     * We immediately delete it so no other worker picks it up (emulating a lock).
     */
    static async pop(queueName: string): Promise<Job | null> {
        const job = await Job.query()
            .where('queue', queueName)
            .where('availableAt', '<=', DateTime.now().toSQL() as string)
            .orderBy('id', 'asc')
            .first()

        if (job) {
            // Auto-parse payload if it's a string (MySQL JSON column might return string or object depending on driver config)
            if (typeof job.payload === 'string') {
                try {
                    job.payload = JSON.parse(job.payload)
                } catch (e) {
                    logger.error(`[Queue] Failed to parse payload for Job ID ${job.id}`)
                }
            }

            // Remove it from DB to 'lock' it. If it fails, we will re-insert it via `release`.
            await job.delete()
            return job
        }

        return null
    }

    /**
     * Release a failed job back onto the queue for a retry if attempts < maxAttempts.
     * If attempts reach maxAttempts, we can log it or move it to a failed_jobs table.
     */
    static async release(job: Job, error: any) {
        const newAttempts = job.attempts + 1
        const errorMessage = error?.message || String(error)

        // Check if max attempts reached
        if (newAttempts >= job.maxAttempts) {
            logger.error(`[Queue] Job on queue ${job.queue} failed permanently after ${newAttempts} attempts. Error: ${errorMessage}`)
            return null
        }

        // Exponential backoff strategy: 5 seconds, 15 seconds, 35 seconds...
        const delaySeconds = 5 * Math.pow(newAttempts, 2)
        const availableAt = DateTime.now().plus({ seconds: delaySeconds })

        // Save it back to the database as a new queued item (since pop deleted the old row)
        const newJob = new Job()
        newJob.queue = job.queue
        newJob.payload = job.payload // already parsed in pop()
        newJob.attempts = newAttempts
        newJob.maxAttempts = job.maxAttempts
        newJob.error = errorMessage
        newJob.availableAt = availableAt
        await newJob.save()

        logger.warn(`[Queue] Job on queue ${job.queue} released back. Will retry at ${availableAt.toISO()} (Attempt ${newAttempts}/${job.maxAttempts})`)
        return newJob
    }
}
