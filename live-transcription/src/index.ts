import 'dotenv/config';
// Use the node-specific transport
import { connect } from '@nats-io/transport-node'; 
import { 
  jetstream, 
  jetstreamManager, 
  AckPolicy, 
  DeliverPolicy,
} from '@nats-io/jetstream';

async function startConsumer(consumerNumber:number) {
  const NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';
  const STREAM_NAME = 'AUDIO_EVENTS';
  const SUBJECT = 'audio.chunk.*';
  
  const DURABLE_NAME = process.env.CONSUMER_NAME || `worker_${Math.floor(Math.random() * 1000)}`;

  try {
    const nc = await connect({ servers: NATS_URL });
    console.log(`Connected to NATS at ${NATS_URL}`);

    const jsm = await jetstreamManager(nc);
    const js = jetstream(nc);

    await jsm.consumers.add(STREAM_NAME, {
      durable_name: DURABLE_NAME,
      ack_policy: AckPolicy.Explicit,
      deliver_policy: DeliverPolicy.All,
      filter_subject: SUBJECT,
    });

    console.log(`Consumer ${consumerNumber} "${DURABLE_NAME}" started.`);

    const consumer = await js.consumers.get(STREAM_NAME, DURABLE_NAME);
    const messages = await consumer.consume();

    for await (const msg of messages) {
      // Your processing logic...
      console.log(`${consumerNumber}: Received chunk on ${msg.subject}`);
      msg.ack();
    }

  } catch (err) {
    console.error("NATS Consumer Error:", err);
    process.exit(1);
  }
}

startConsumer(1);
startConsumer(2);
startConsumer(3);