const path = require('node:path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const TARGET_DATABASE = 'eventhub_dev';
const TARGET_COLLECTION = 'eventstaffassignments';
const TARGET_INDEX_KEY = { userId: 1, eventId: 1 };

const validateTarget = (uri, nodeEnv) => {
    if (nodeEnv !== 'development') {
        throw new Error('Refusing migration: NODE_ENV must be exactly "development".');
    }
    if (typeof uri !== 'string' || !uri.trim()) {
        throw new Error('Refusing migration: MONGODB_URI is not configured.');
    }

    let parsed;
    try {
        parsed = new URL(uri);
    } catch {
        throw new Error('Refusing migration: MONGODB_URI is not a valid MongoDB URI.');
    }

    if (parsed.protocol !== 'mongodb:') {
        throw new Error('Refusing migration: only a standard mongodb:// URI is allowed.');
    }
    const validHosts = new Set(['127.0.0.1:27017', 'localhost:27017']);
    if (!validHosts.has(parsed.host.toLowerCase())) {
        throw new Error('Refusing migration: MongoDB host and port must be 127.0.0.1:27017 or localhost:27017.');
    }
    const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    if (databaseName !== TARGET_DATABASE) {
        throw new Error(`Refusing migration: database name must be exactly "${TARGET_DATABASE}".`);
    }
    if (parsed.hash) {
        throw new Error('Refusing migration: URI fragments are not allowed.');
    }
    const connectionOptions = new URLSearchParams(parsed.search);
    if (connectionOptions.has('replicaSet') || connectionOptions.get('loadBalanced') === 'true') {
        throw new Error('Refusing migration: replica-set discovery and load-balanced targets are not allowed.');
    }

    return uri;
};

const hasExactKey = (index) => {
    const entries = Object.entries(index.key || {});
    return entries.length === 2
        && entries[0][0] === 'userId' && entries[0][1] === 1
        && entries[1][0] === 'eventId' && entries[1][1] === 1;
};

const isFullUniqueIndex = (index) => index.unique === true
    && !index.partialFilterExpression
    && index.sparse !== true;

const migrate = async () => {
    const uri = validateTarget(process.env.MONGODB_URI, process.env.NODE_ENV);
    await mongoose.connect(uri);

    const collection = mongoose.connection.db.collection(TARGET_COLLECTION);
    let malformedAssignments;
    try {
        malformedAssignments = await collection.find({
            $or: [
                { userId: { $exists: false } },
                { userId: null },
                { eventId: { $exists: false } },
                { eventId: null },
            ],
        }, {
            projection: { _id: 1, userId: 1, eventId: 1 },
        }).toArray();
    } catch (error) {
        if (error.codeName === 'NamespaceNotFound' || error.code === 26) malformedAssignments = [];
        else throw error;
    }

    if (malformedAssignments.length) {
        const report = malformedAssignments.map((assignment) => ({
            assignmentId: assignment._id.toString(),
            userId: !Object.prototype.hasOwnProperty.call(assignment, 'userId')
                ? 'missing'
                : assignment.userId === null ? 'null' : 'present',
            eventId: !Object.prototype.hasOwnProperty.call(assignment, 'eventId')
                ? 'missing'
                : assignment.eventId === null ? 'null' : 'present',
        }));
        console.error('Malformed assignments found (missing/null userId or eventId). No data or indexes were changed:');
        console.error(JSON.stringify(report, null, 2));
        throw new Error('Resolve malformed assignments manually; this migration will not modify records.');
    }

    let indexes;
    try {
        indexes = await collection.indexes();
    } catch (error) {
        if (error.codeName === 'NamespaceNotFound' || error.code === 26) indexes = [];
        else throw error;
    }

    const sameKeyIndexes = indexes.filter(hasExactKey);
    const existingUnique = sameKeyIndexes.find(isFullUniqueIndex);
    if (existingUnique) {
        console.log(`Index already exists; no changes made: ${existingUnique.name}`);
        return;
    }
    if (sameKeyIndexes.length) {
        console.error('Conflicting index found; it was left unchanged:');
        console.error(JSON.stringify(sameKeyIndexes, null, 2));
        throw new Error('Resolve the existing same-key index manually before retrying.');
    }

    let duplicates;
    try {
        duplicates = await collection.aggregate([
            {
                $group: {
                    _id: { userId: '$userId', eventId: '$eventId' },
                    count: { $sum: 1 },
                    assignmentIds: { $push: '$_id' },
                },
            },
            { $match: { count: { $gt: 1 } } },
        ]).toArray();
    } catch (error) {
        if (error.codeName === 'NamespaceNotFound' || error.code === 26) duplicates = [];
        else throw error;
    }

    if (duplicates.length) {
        const report = duplicates.map(({ _id, count, assignmentIds }) => ({
            userId: _id.userId?.toString() ?? null,
            eventId: _id.eventId?.toString() ?? null,
            count,
            assignmentIds: assignmentIds.map((id) => id.toString()),
        }));
        console.error('Duplicate (userId, eventId) pairs found. No data or indexes were changed:');
        console.error(JSON.stringify(report, null, 2));
        throw new Error('Resolve duplicate assignments manually; this migration will not delete or merge records.');
    }

    const name = await collection.createIndex(TARGET_INDEX_KEY, { unique: true });
    console.log(`Created ${TARGET_COLLECTION}.${name} with unique:true.`);
};

const main = async () => {
    try {
        await migrate();
    } catch (error) {
        console.error(`EventStaffAssignment index migration stopped: ${error.message}`);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

if (require.main === module) void main();
