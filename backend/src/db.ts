import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '..', 'hazard.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'executor', 'supervisor')),
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS floors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(project_id, code)
    );

    CREATE TABLE IF NOT EXISTS areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      floor_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE,
      UNIQUE(floor_id, code)
    );

    CREATE TABLE IF NOT EXISTS hazard_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (parent_id) REFERENCES hazard_types(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS responsibility_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      leader TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS hazard_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      floor_id INTEGER NOT NULL,
      area_id INTEGER NOT NULL,
      hazard_type_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      photos TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'rectifying', 'closed')),
      executor_id INTEGER NOT NULL,
      supervisor_id INTEGER,
      rectification_desc TEXT,
      rectification_photos TEXT,
      review_comment TEXT,
      deadline_date TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      rectified_at TEXT,
      closed_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (floor_id) REFERENCES floors(id),
      FOREIGN KEY (area_id) REFERENCES areas(id),
      FOREIGN KEY (hazard_type_id) REFERENCES hazard_types(id),
      FOREIGN KEY (group_id) REFERENCES responsibility_groups(id),
      FOREIGN KEY (executor_id) REFERENCES users(id),
      FOREIGN KEY (supervisor_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS rectification_deadline_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hazard_type_parent_id INTEGER NOT NULL,
      default_days INTEGER NOT NULL DEFAULT 7,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (hazard_type_parent_id) REFERENCES hazard_types(id) ON DELETE CASCADE,
      UNIQUE(hazard_type_parent_id)
    );

    CREATE INDEX IF NOT EXISTS idx_hazard_project ON hazard_records(project_id);
    CREATE INDEX IF NOT EXISTS idx_hazard_floor ON hazard_records(floor_id);
    CREATE INDEX IF NOT EXISTS idx_hazard_area ON hazard_records(area_id);
    CREATE INDEX IF NOT EXISTS idx_hazard_type ON hazard_records(hazard_type_id);
    CREATE INDEX IF NOT EXISTS idx_hazard_group ON hazard_records(group_id);
    CREATE INDEX IF NOT EXISTS idx_hazard_status ON hazard_records(status);
  `);

  const columns = db.prepare("PRAGMA table_info(hazard_records)").all() as any[];
  const hasDeadlineDate = columns.some(c => c.name === 'deadline_date');
  if (!hasDeadlineDate) {
    db.exec("ALTER TABLE hazard_records ADD COLUMN deadline_date TEXT");
  }

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)
    `);
    insertUser.run('admin', 'admin123', 'admin', '系统管理员');
    insertUser.run('executor', 'exec123', 'executor', '张三');
    insertUser.run('executor2', 'exec123', 'executor', '李四');
    insertUser.run('supervisor', 'super123', 'supervisor', '王监督');
  }

  const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
  if (projectCount.count === 0) {
    const insertProject = db.prepare('INSERT INTO projects (name, code) VALUES (?, ?)');
    const projects = [
      ['城市综合体A区', 'P001'],
      ['科技园区B栋', 'P002'],
      ['住宅小区C期', 'P003'],
      ['商业中心D区', 'P004'],
      ['地铁站点E段', 'P005'],
    ];
    const projectIds: number[] = [];
    projects.forEach(([name, code]) => {
      const result = insertProject.run(name, code);
      projectIds.push(Number(result.lastInsertRowid));
    });

    const insertFloor = db.prepare('INSERT INTO floors (project_id, name, code) VALUES (?, ?, ?)');
    const floorIds: number[] = [];
    projectIds.forEach((pid, idx) => {
      for (let i = 1; i <= 10; i++) {
        const result = insertFloor.run(pid, `${i}层`, `F${String(i).padStart(2, '0')}`);
        floorIds.push(Number(result.lastInsertRowid));
      }
    });

    const insertArea = db.prepare('INSERT INTO areas (floor_id, name, code) VALUES (?, ?, ?)');
    const areaNames = ['东区', '西区', '南区', '北区', '中庭', '楼梯间', '电梯厅', '设备间'];
    floorIds.forEach((fid) => {
      areaNames.forEach((name, idx) => {
        insertArea.run(fid, name, `A${String(idx + 1).padStart(2, '0')}`);
      });
    });

    const insertHazardType = db.prepare('INSERT INTO hazard_types (parent_id, name, code) VALUES (?, ?, ?)');
    const hazardCategories = [
      { name: '安全防护', code: 'HT01', children: ['临边防护', '洞口防护', '安全帽', '安全带', '安全网'] },
      { name: '临时用电', code: 'HT02', children: ['配电箱', '线缆敷设', '接地保护', '漏电保护', '照明设施'] },
      { name: '机械设备', code: 'HT03', children: ['塔吊', '施工电梯', '脚手架', '物料提升机', '电焊机'] },
      { name: '消防设施', code: 'HT04', children: ['灭火器', '消防栓', '消防通道', '易燃物品', '动火作业'] },
      { name: '文明施工', code: 'HT05', children: ['现场围挡', '材料堆放', '场地卫生', '扬尘控制', '噪声控制'] },
    ];
    hazardCategories.forEach((cat) => {
      const result = insertHazardType.run(null, cat.name, cat.code);
      const parentId = Number(result.lastInsertRowid);
      cat.children.forEach((child, idx) => {
        insertHazardType.run(parentId, child, `${cat.code}-${String(idx + 1).padStart(2, '0')}`);
      });
    });

    const insertGroup = db.prepare('INSERT INTO responsibility_groups (name, leader, phone) VALUES (?, ?, ?)');
    const groups = [
      ['土建一组', '李组长', '13800138001'],
      ['土建二组', '王组长', '13800138002'],
      ['机电一组', '张组长', '13800138003'],
      ['机电二组', '刘组长', '13800138004'],
      ['装饰一组', '陈组长', '13800138005'],
      ['装饰二组', '杨组长', '13800138006'],
      ['消防班组', '黄组长', '13800138007'],
      ['安全班组', '赵组长', '13800138008'],
    ];
    groups.forEach(([name, leader, phone]) => {
      insertGroup.run(name, leader, phone);
    });

    const insertHazard = db.prepare(`
      INSERT INTO hazard_records 
      (project_id, floor_id, area_id, hazard_type_id, group_id, description, status, executor_id, deadline_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const statuses = ['pending', 'rectifying', 'closed'];
    for (let i = 1; i <= 200; i++) {
      const projectId = (i % 5) + 1;
      const floorId = (projectId - 1) * 10 + (i % 10) + 1;
      const areaId = (floorId - 1) * 8 + (i % 8) + 1;
      const hazardTypeId = (i % 20) + 6;
      const groupId = (i % 8) + 1;
      const status = statuses[i % 3];
      const daysToAdd = 5 + (i % 10);
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + daysToAdd);
      const deadlineStr = deadlineDate.toISOString().slice(0, 10);
      insertHazard.run(
        projectId,
        floorId,
        areaId,
        hazardTypeId,
        groupId,
        `隐患记录 ${i}：现场发现安全隐患，需要及时整改。详情请查看现场照片。`,
        status,
        (i % 2) + 2,
        deadlineStr
      );
    }

    const insertDeadlineRule = db.prepare(`
      INSERT OR IGNORE INTO rectification_deadline_rules 
      (hazard_type_parent_id, default_days)
      VALUES (?, ?)
    `);
    const defaultRules = [
      [1, 7],
      [7, 5],
      [13, 10],
      [19, 3],
      [25, 7],
    ];
    defaultRules.forEach(([parentId, days]) => {
      insertDeadlineRule.run(parentId, days);
    });
  }
}

initDatabase();

export default db;
