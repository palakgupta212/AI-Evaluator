import bcrypt from 'bcrypt';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTeacher(username, password) {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
      [username, hashedPassword, 'teacher']
    );
    
    console.log(`✅ Teacher account created successfully!`);
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    
  } catch (err) {
    if (err.code === '23505') {
      console.error('❌ Error: Username already exists');
    } else {
      console.error('❌ Error creating teacher:', err.message);
    }
  } finally {
    await pool.end();
  }
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: docker exec -it ai-evaluator-backend-1 npm run create-teacher <username> <password>');
  process.exit(1);
}

createTeacher(args[0], args[1]);