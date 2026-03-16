import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

// Detectar se estamos em ambiente de popup da extensão
const isExtensionPopup = () => {
  return (
    typeof browser !== 'undefined' &&
    browser.runtime &&
    browser.runtime.id &&
    window.location.pathname.includes('popup.html')
  );
};

const routes = [
  {
    path: '/',
    name: 'Login',
    component: () => import('@/pages/Login.vue'),
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/pages/Dashboard.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/pages/About.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/whatsapp',
    name: 'WhatsApp',
    component: () => import('@/pages/WhatsApp.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/person',
    name: 'PersonGeneral',
    component: () => import('@/pages/Person.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/person/search/:chatId/:chatName',
    name: 'Person',
    component: () => import('@/pages/Person.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/processes',
    name: 'ProcessIndex',
    component: () => import('@/pages/ProcessIndex.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/process/:id',
    name: 'ProcessView',
    component: () => import('@/pages/ProcessView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/people/edit/:id',
    name: 'EditPerson',
    component: () => import('@/pages/EditPerson.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/case/edit/:uuid',
    name: 'EditCase',
    component: () => import('@/pages/EditCase.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/actions',
    name: 'Actions',
    component: () => import('@/pages/Actions.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('@/pages/Tasks.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/tasks/add',
    name: 'AddTask',
    component: () => import('@/pages/AddTask.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/tasks/:id',
    name: 'TaskDetail',
    component: () => import('@/pages/TaskDetail.vue'),
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// Middleware de autenticação
router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore();
  const token = auth.token;
  const isAuthenticated = !!token;

  console.log('[Router] Environment:', {
    isPopup: isExtensionPopup(),
    hasBrowser: typeof browser !== 'undefined',
    hasRuntime: typeof browser !== 'undefined' && !!browser.runtime,
    pathname: window.location.pathname,
    href: window.location.href,
  });

  if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
    browser.storage.local.set({ lastRoute: to.fullPath });
  }

  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (!isAuthenticated) {
      next({ name: 'Login' });
    } else {
      if (!auth.user) {
        try {
          await auth.fetchUser();
          next();
        } catch (error) {
          console.error('Erro no middleware de autenticação:', error);
          next({ name: 'Login' });
        }
      } else {
        next();
      }
    }
  } else if (to.name === 'Login' && isAuthenticated) {
    next({ name: 'Dashboard' });
  } else {
    next();
  }
});

export default router;
