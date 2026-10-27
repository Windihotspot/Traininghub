
export interface SidebarItem {
  title: string
  path: string
  icon: string
}

export interface SidebarSection {
  section: string
  roles: string[]
  items: SidebarItem[]
}

const sidebarItems: SidebarSection[] = [
  {
    section: 'WORKSPACE',
    roles: ['org_owner', 'org_admin', 'org_staff'],
    items: [
      {
        title: 'Dashboard',
        path: '/dashboard',
        icon: 'fa-solid fa-house',
      },
    ],
  },
  // {
  //   section: 'TRAINING MANAGEMENT',
  //   roles: ['org_owner', 'org_admin', 'org_staff'],
  //   items: [
     
  //     {
  //       title: 'Trainings',
  //       path: '/dashboard/trainings/new',
  //       icon: 'fa-solid fa-circle-plus',
  //     },
  //   ],
  // },
  {
    section: 'PLATFORM ADMINISTRATION',
    roles: ['super_admin', 'platform_admin'],
    items: [
      {
        title: 'Organisations',
        path: '/admin/organisations',
        icon: 'fa-solid fa-building',
      },
    ],
  },
]

export default sidebarItems
