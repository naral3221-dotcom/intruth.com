const mysql = require('mysql2/promise');

async function checkProjectAssignees() {
  try {
    const connection = await mysql.createConnection({
      host: 'balancelab.kr',
      port: 3306,
      user: 'balancelab23',
      password: 'erer0.0.',
      database: 'balancelab23'
    });

    console.log('MySQL 연결 성공!');

    // 프로젝트 17번의 teamAssignments 확인
    console.log('\n=== 프로젝트 17번 teamAssignments ===');
    const [assignees] = await connection.execute(`
      SELECT pta.*, p.name as project_name, t.name as team_name, u.name as user_name
      FROM wf_project_team_assignees pta
      LEFT JOIN wf_projects p ON pta.project_id = p.id
      LEFT JOIN wf_teams t ON pta.team_id = t.id
      LEFT JOIN wf_users u ON pta.member_id = u.id
      WHERE pta.project_id = 17
    `);
    if (assignees.length === 0) {
      console.log('  (데이터 없음)');
    } else {
      assignees.forEach((row) => {
        console.log(`  ProjectID: ${row.project_id} (${row.project_name}), TeamID: ${row.team_id} (${row.team_name}), MemberID: ${row.member_id} (${row.user_name})`);
      });
    }

    // 전체 wf_project_team_assignees 확인
    console.log('\n=== 전체 wf_project_team_assignees ===');
    const [allAssignees] = await connection.execute(`
      SELECT pta.*, p.name as project_name, t.name as team_name, u.name as user_name
      FROM wf_project_team_assignees pta
      LEFT JOIN wf_projects p ON pta.project_id = p.id
      LEFT JOIN wf_teams t ON pta.team_id = t.id
      LEFT JOIN wf_users u ON pta.member_id = u.id
      ORDER BY pta.project_id
    `);
    if (allAssignees.length === 0) {
      console.log('  (데이터 없음)');
    } else {
      allAssignees.forEach((row) => {
        console.log(`  ProjectID: ${row.project_id} (${row.project_name}), TeamID: ${row.team_id} (${row.team_name}), MemberID: ${row.member_id} (${row.user_name})`);
      });
    }

    await connection.end();
  } catch (error) {
    console.error('에러:', error.message);
  }
}

checkProjectAssignees();
