import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 기본 권한 생성
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      name: 'Admin',
      description: '시스템 관리자',
      isSystem: true,
      permissions: JSON.stringify({
        project: { create: true, edit: true, delete: true, manage_members: true },
        task: { create: true, edit: true, delete: true, assign: true },
        member: { view_all: true, view_workload: true, manage: true },
        system: { manage_roles: true, view_all_stats: true, manage_settings: true }
      })
    }
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {},
    create: {
      name: 'Manager',
      description: '팀 관리자',
      isSystem: true,
      permissions: JSON.stringify({
        project: { create: true, edit: true, delete: false, manage_members: true },
        task: { create: true, edit: true, delete: true, assign: true },
        member: { view_all: true, view_workload: true, manage: false },
        system: { manage_roles: false, view_all_stats: true, manage_settings: false }
      })
    }
  });

  const memberRole = await prisma.role.upsert({
    where: { name: 'Member' },
    update: {},
    create: {
      name: 'Member',
      description: '일반 팀원',
      isSystem: true,
      permissions: JSON.stringify({
        project: { create: false, edit: false, delete: false, manage_members: false },
        task: { create: true, edit: true, delete: false, assign: false },
        member: { view_all: true, view_workload: false, manage: false },
        system: { manage_roles: false, view_all_stats: false, manage_settings: false }
      })
    }
  });

  // 테스트 사용자 생성
  const hashedAdminPassword = await bcrypt.hash('admin1234', 10);
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.member.upsert({
    where: { email: 'admin@example.com' },
    update: {
      username: 'admin',
      password: hashedAdminPassword,
    },
    create: {
      username: 'admin',
      email: 'admin@example.com',
      password: hashedAdminPassword,
      name: '관리자',
      roleId: adminRole.id,
      department: '개발팀',
      position: '팀장'
    }
  });

  const member1 = await prisma.member.upsert({
    where: { email: 'hong@example.com' },
    update: {
      username: 'hong',
      password: hashedPassword,
    },
    create: {
      username: 'hong',
      email: 'hong@example.com',
      password: hashedPassword,
      name: '홍길동',
      roleId: memberRole.id,
      department: '개발팀',
      position: '선임 개발자'
    }
  });

  const member2 = await prisma.member.upsert({
    where: { email: 'kim@example.com' },
    update: {
      username: 'kim',
      password: hashedPassword,
    },
    create: {
      username: 'kim',
      email: 'kim@example.com',
      password: hashedPassword,
      name: '김철수',
      roleId: memberRole.id,
      department: '디자인팀',
      position: '디자이너'
    }
  });

  const member3 = await prisma.member.upsert({
    where: { email: 'lee@example.com' },
    update: {
      username: 'lee',
      password: hashedPassword,
    },
    create: {
      username: 'lee',
      email: 'lee@example.com',
      password: hashedPassword,
      name: '이영희',
      roleId: managerRole.id,
      department: '마케팅팀',
      position: '팀장'
    }
  });

  // 샘플 프로젝트 생성
  const project = await prisma.project.upsert({
    where: { id: 'sample-project-1' },
    update: {},
    create: {
      id: 'sample-project-1',
      name: '워크플로우 시스템 개발',
      description: '팀 업무 관리를 위한 워크플로우 시스템 개발 프로젝트',
      status: 'ACTIVE',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
      ownerId: admin.id,
      members: {
        create: [
          { memberId: admin.id, role: 'OWNER' },
          { memberId: member1.id, role: 'EDITOR' },
          { memberId: member2.id, role: 'EDITOR' },
          { memberId: member3.id, role: 'VIEWER' }
        ]
      }
    }
  });

  // 샘플 라벨 생성
  const labels = await Promise.all([
    prisma.taskLabel.upsert({
      where: { id: 'label-bug' },
      update: {},
      create: { id: 'label-bug', name: '버그', color: '#ef4444', projectId: project.id }
    }),
    prisma.taskLabel.upsert({
      where: { id: 'label-feature' },
      update: {},
      create: { id: 'label-feature', name: '기능', color: '#3b82f6', projectId: project.id }
    }),
    prisma.taskLabel.upsert({
      where: { id: 'label-urgent' },
      update: {},
      create: { id: 'label-urgent', name: '긴급', color: '#f97316', projectId: project.id }
    })
  ]);

  // 샘플 업무 생성
  const tasks = [
    { title: 'DB 스키마 설계', status: 'DONE', priority: 'HIGH', assigneeId: admin.id, order: 1 },
    { title: 'API 엔드포인트 구현', status: 'DONE', priority: 'HIGH', assigneeId: member1.id, order: 2 },
    { title: 'UI 디자인 시안 작성', status: 'DONE', priority: 'MEDIUM', assigneeId: member2.id, order: 3 },
    { title: '프론트엔드 컴포넌트 개발', status: 'IN_PROGRESS', priority: 'HIGH', assigneeId: member1.id, order: 1 },
    { title: '칸반 보드 드래그앤드롭', status: 'IN_PROGRESS', priority: 'MEDIUM', assigneeId: member1.id, order: 2 },
    { title: '간트 차트 구현', status: 'TODO', priority: 'MEDIUM', assigneeId: member1.id, order: 1 },
    { title: '대시보드 통계 차트', status: 'TODO', priority: 'LOW', assigneeId: member2.id, order: 2 },
    { title: '사용자 테스트', status: 'TODO', priority: 'HIGH', assigneeId: member3.id, order: 3 },
    { title: '배포 환경 설정', status: 'REVIEW', priority: 'MEDIUM', assigneeId: admin.id, order: 1 },
    { title: '문서화 작업', status: 'REVIEW', priority: 'LOW', assigneeId: member3.id, order: 2 }
  ];

  for (const taskData of tasks) {
    await prisma.task.create({
      data: {
        projectId: project.id,
        title: taskData.title,
        status: taskData.status as any,
        priority: taskData.priority as any,
        assigneeId: taskData.assigneeId,
        reporterId: admin.id,
        order: taskData.order,
        startDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
  }

  console.log('✅ Seed completed!');
  console.log('📧 Test accounts:');
  console.log('   - admin / admin1234 (Admin)');
  console.log('   - hong / password123 (Member)');
  console.log('   - kim / password123 (Member)');
  console.log('   - lee / password123 (Manager)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
