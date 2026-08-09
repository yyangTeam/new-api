import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  getModels,
  searchModels,
  getModel,
  createModel,
  updateModel,
  updateModelStatus,
  deleteModel,
  getVendors,
  searchVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
  syncUpstream,
  previewUpstreamDiff,
  applyUpstreamOverwrite,
  getMissingModels,
  getPrefillGroups,
  createPrefillGroup,
  updatePrefillGroup,
  deletePrefillGroup,
  getDeploymentSettings,
  testDeploymentConnection,
  testDeploymentConnectionWithKey,
  listDeployments,
  searchDeployments,
  getDeployment,
  listDeploymentContainers,
  getDeploymentContainerDetails,
  deleteDeployment,
  getDeploymentLogs,
  getHardwareTypes,
  getDeploymentLocations,
  getAvailableReplicas,
  estimatePrice,
  createDeployment,
  updateDeployment,
  updateDeploymentName,
  extendDeployment,
  checkClusterNameAvailability,
} from './api'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

describe('Models API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ data: { success: true } })
    mockPost.mockResolvedValue({ data: { success: true } })
    mockPut.mockResolvedValue({ data: { success: true } })
    mockDelete.mockResolvedValue({ data: { success: true } })
  })

  describe('getModels', () => {
    it('calls GET /api/models/ with default params', async () => {
      await getModels()
      expect(mockGet).toHaveBeenCalledWith('/api/models/', { params: {} })
    })

    it('passes params to GET', async () => {
      await getModels({ p: 2, page_size: 10, status: 'enabled' })
      expect(mockGet).toHaveBeenCalledWith('/api/models/', {
        params: { p: 2, page_size: 10, status: 'enabled' },
      })
    })
  })

  describe('searchModels', () => {
    it('calls GET /api/models/search with params', async () => {
      await searchModels({ keyword: 'gpt', p: 1, page_size: 20 })
      expect(mockGet).toHaveBeenCalledWith('/api/models/search', {
        params: { keyword: 'gpt', p: 1, page_size: 20 },
      })
    })
  })

  describe('getModel', () => {
    it('calls GET /api/models/:id', async () => {
      await getModel(42)
      expect(mockGet).toHaveBeenCalledWith('/api/models/42')
    })
  })

  describe('createModel', () => {
    it('calls POST /api/models/', async () => {
      await createModel({ model_name: 'gpt-4' })
      expect(mockPost).toHaveBeenCalledWith('/api/models/', { model_name: 'gpt-4' })
    })
  })

  describe('updateModel', () => {
    it('calls PUT /api/models/', async () => {
      await updateModel({ id: 1, model_name: 'gpt-4-updated' })
      expect(mockPut).toHaveBeenCalledWith('/api/models/', { id: 1, model_name: 'gpt-4-updated' })
    })
  })

  describe('updateModelStatus', () => {
    it('calls PUT /api/models/?status_only=true', async () => {
      await updateModelStatus(5, 1)
      expect(mockPut).toHaveBeenCalledWith('/api/models/?status_only=true', { id: 5, status: 1 })
    })
  })

  describe('deleteModel', () => {
    it('calls DELETE /api/models/:id', async () => {
      await deleteModel(7)
      expect(mockDelete).toHaveBeenCalledWith('/api/models/7')
    })
  })

  describe('getVendors', () => {
    it('calls GET /api/vendors/ with default page_size 1000', async () => {
      await getVendors()
      expect(mockGet).toHaveBeenCalledWith('/api/vendors/', { params: { page_size: 1000 } })
    })

    it('passes custom params', async () => {
      await getVendors({ p: 1, page_size: 50 })
      expect(mockGet).toHaveBeenCalledWith('/api/vendors/', { params: { p: 1, page_size: 50 } })
    })
  })

  describe('searchVendors', () => {
    it('calls GET /api/vendors/search', async () => {
      await searchVendors({ keyword: 'openai' })
      expect(mockGet).toHaveBeenCalledWith('/api/vendors/search', { params: { keyword: 'openai' } })
    })
  })

  describe('getVendor', () => {
    it('calls GET /api/vendors/:id', async () => {
      await getVendor(3)
      expect(mockGet).toHaveBeenCalledWith('/api/vendors/3')
    })
  })

  describe('createVendor', () => {
    it('calls POST /api/vendors/', async () => {
      await createVendor({ name: 'OpenAI' })
      expect(mockPost).toHaveBeenCalledWith('/api/vendors/', { name: 'OpenAI' })
    })
  })

  describe('updateVendor', () => {
    it('calls PUT /api/vendors/', async () => {
      await updateVendor({ id: 2, name: 'Anthropic' })
      expect(mockPut).toHaveBeenCalledWith('/api/vendors/', { id: 2, name: 'Anthropic' })
    })
  })

  describe('deleteVendor', () => {
    it('calls DELETE /api/vendors/:id', async () => {
      await deleteVendor(9)
      expect(mockDelete).toHaveBeenCalledWith('/api/vendors/9')
    })
  })

  describe('syncUpstream', () => {
    it('calls POST /api/models/sync_upstream', async () => {
      await syncUpstream({ locale: 'en', source: 'official' })
      expect(mockPost).toHaveBeenCalledWith('/api/models/sync_upstream', {
        locale: 'en',
        source: 'official',
      })
    })

    it('sends without params', async () => {
      await syncUpstream()
      expect(mockPost).toHaveBeenCalledWith('/api/models/sync_upstream', undefined)
    })
  })

  describe('previewUpstreamDiff', () => {
    it('calls GET with locale and source params', async () => {
      await previewUpstreamDiff({ locale: 'zh', source: 'official' })
      expect(mockGet).toHaveBeenCalledWith(
        '/api/models/sync_upstream/preview?locale=zh&source=official'
      )
    })

    it('calls GET without params when undefined', async () => {
      await previewUpstreamDiff()
      expect(mockGet).toHaveBeenCalledWith('/api/models/sync_upstream/preview')
    })

    it('calls GET with locale only', async () => {
      await previewUpstreamDiff({ locale: 'en' })
      expect(mockGet).toHaveBeenCalledWith('/api/models/sync_upstream/preview?locale=en')
    })
  })

  describe('applyUpstreamOverwrite', () => {
    it('delegates to syncUpstream', async () => {
      await applyUpstreamOverwrite({
        overwrite: [{ model_name: 'gpt-4', fields: ['description'] }],
        locale: 'en',
      })
      expect(mockPost).toHaveBeenCalledWith('/api/models/sync_upstream', {
        overwrite: [{ model_name: 'gpt-4', fields: ['description'] }],
        locale: 'en',
      })
    })
  })

  describe('getMissingModels', () => {
    it('calls GET /api/models/missing', async () => {
      await getMissingModels()
      expect(mockGet).toHaveBeenCalledWith('/api/models/missing')
    })
  })

  describe('getPrefillGroups', () => {
    it('calls GET /api/prefill_group without type', async () => {
      await getPrefillGroups()
      expect(mockGet).toHaveBeenCalledWith('/api/prefill_group', { params: undefined })
    })

    it('calls GET /api/prefill_group with type', async () => {
      await getPrefillGroups('model')
      expect(mockGet).toHaveBeenCalledWith('/api/prefill_group', { params: { type: 'model' } })
    })
  })

  describe('createPrefillGroup', () => {
    it('calls POST /api/prefill_group', async () => {
      await createPrefillGroup({ name: 'Group A', type: 'tag', items: ['a', 'b'] })
      expect(mockPost).toHaveBeenCalledWith('/api/prefill_group', {
        name: 'Group A',
        type: 'tag',
        items: ['a', 'b'],
      })
    })
  })

  describe('updatePrefillGroup', () => {
    it('calls PUT /api/prefill_group', async () => {
      await updatePrefillGroup({ id: 5, name: 'Updated' })
      expect(mockPut).toHaveBeenCalledWith('/api/prefill_group', { id: 5, name: 'Updated' })
    })
  })

  describe('deletePrefillGroup', () => {
    it('calls DELETE /api/prefill_group/:id', async () => {
      await deletePrefillGroup(8)
      expect(mockDelete).toHaveBeenCalledWith('/api/prefill_group/8')
    })
  })

  describe('getDeploymentSettings', () => {
    it('calls GET /api/deployments/settings', async () => {
      await getDeploymentSettings()
      expect(mockGet).toHaveBeenCalledWith('/api/deployments/settings')
    })
  })

  describe('testDeploymentConnection', () => {
    it('calls POST /api/deployments/settings/test-connection', async () => {
      await testDeploymentConnection()
      expect(mockPost).toHaveBeenCalledWith(
        '/api/deployments/settings/test-connection',
        {},
        expect.anything()
      )
    })
  })

  describe('testDeploymentConnectionWithKey', () => {
    it('sends api_key when provided', async () => {
      await testDeploymentConnectionWithKey('my-key')
      expect(mockPost).toHaveBeenCalledWith(
        '/api/deployments/settings/test-connection',
        { api_key: 'my-key' },
        expect.anything()
      )
    })

    it('sends empty payload when key is empty', async () => {
      await testDeploymentConnectionWithKey('')
      expect(mockPost).toHaveBeenCalledWith(
        '/api/deployments/settings/test-connection',
        {},
        expect.anything()
      )
    })

    it('sends empty payload when key is undefined', async () => {
      await testDeploymentConnectionWithKey()
      expect(mockPost).toHaveBeenCalledWith(
        '/api/deployments/settings/test-connection',
        {},
        expect.anything()
      )
    })
  })

  describe('listDeployments', () => {
    it('calls GET /api/deployments/', async () => {
      await listDeployments({ p: 1, page_size: 10, status: 'running' })
      expect(mockGet).toHaveBeenCalledWith('/api/deployments/', {
        params: { p: 1, page_size: 10, status: 'running' },
      })
    })
  })

  describe('searchDeployments', () => {
    it('calls GET /api/deployments/search', async () => {
      await searchDeployments({ keyword: 'test', status: 'running' })
      expect(mockGet).toHaveBeenCalledWith('/api/deployments/search', {
        params: { keyword: 'test', status: 'running' },
      })
    })
  })

  describe('getDeployment', () => {
    it('calls GET /api/deployments/:id', async () => {
      await getDeployment('deploy_123')
      expect(mockGet).toHaveBeenCalledWith('/api/deployments/deploy_123')
    })
  })

  describe('listDeploymentContainers', () => {
    it('calls GET /api/deployments/:id/containers', async () => {
      await listDeploymentContainers('d1')
      expect(mockGet).toHaveBeenCalledWith('/api/deployments/d1/containers')
    })
  })

  describe('getDeploymentContainerDetails', () => {
    it('calls GET with encoded container ID', async () => {
      await getDeploymentContainerDetails('d1', 'container/id')
      expect(mockGet).toHaveBeenCalledWith(
        '/api/deployments/d1/containers/container%2Fid'
      )
    })
  })

  describe('deleteDeployment', () => {
    it('calls DELETE /api/deployments/:id', async () => {
      await deleteDeployment('d5')
      expect(mockDelete).toHaveBeenCalledWith('/api/deployments/d5')
    })
  })

  describe('getDeploymentLogs', () => {
    it('calls GET /api/deployments/:id/logs with params', async () => {
      await getDeploymentLogs('d1', { container_id: 'c1', stream: 'stdout' })
      expect(mockGet).toHaveBeenCalledWith('/api/deployments/d1/logs', {
        params: { container_id: 'c1', stream: 'stdout' },
      })
    })
  })

  describe('getHardwareTypes', () => {
    it('calls GET /api/deployments/hardware-types', async () => {
      await getHardwareTypes()
      expect(mockGet).toHaveBeenCalledWith('/api/deployments/hardware-types')
    })
  })

  describe('getDeploymentLocations', () => {
    it('calls GET /api/deployments/locations', async () => {
      await getDeploymentLocations()
      expect(mockGet).toHaveBeenCalledWith('/api/deployments/locations')
    })
  })

  describe('getAvailableReplicas', () => {
    it('calls GET /api/deployments/available-replicas', async () => {
      await getAvailableReplicas({ hardware_id: 'hw1', gpu_count: 4 })
      expect(mockGet).toHaveBeenCalledWith('/api/deployments/available-replicas', {
        params: { hardware_id: 'hw1', gpu_count: 4 },
      })
    })
  })

  describe('estimatePrice', () => {
    it('calls POST /api/deployments/price-estimation with normalized payload', async () => {
      await estimatePrice({
        location_ids: ['1', '2'],
        hardware_id: '5',
        gpus_per_container: 2,
        duration_hours: 24,
        replica_count: 3,
        currency: 'USDC',
      })
      expect(mockPost).toHaveBeenCalledWith('/api/deployments/price-estimation', {
        location_ids: [1, 2],
        hardware_id: 5,
        gpus_per_container: 2,
        duration_hours: 24,
        replica_count: 3,
        currency: 'usdc',
        duration_type: 'hour',
        duration_qty: 24,
        hardware_qty: 2,
      })
    })

    it('filters invalid location IDs', async () => {
      await estimatePrice({
        location_ids: ['abc', '0', '3'],
        hardware_id: '1',
        gpus_per_container: 1,
        duration_hours: 1,
        replica_count: 1,
      })
      expect(mockPost).toHaveBeenCalledWith(
        '/api/deployments/price-estimation',
        expect.objectContaining({ location_ids: [3] })
      )
    })

    it('defaults currency to usdc', async () => {
      await estimatePrice({
        location_ids: [1],
        hardware_id: '1',
        gpus_per_container: 1,
        duration_hours: 1,
        replica_count: 1,
      })
      expect(mockPost).toHaveBeenCalledWith(
        '/api/deployments/price-estimation',
        expect.objectContaining({ currency: 'usdc' })
      )
    })
  })

  describe('createDeployment', () => {
    it('calls POST /api/deployments/', async () => {
      const data = {
        resource_private_name: 'my-cluster',
        duration_hours: 48,
        gpus_per_container: 4,
        hardware_id: 1,
        location_ids: [1, 2],
        container_config: { replica_count: 2 },
        registry_config: { image_url: 'docker.io/test' },
      }
      await createDeployment(data)
      expect(mockPost).toHaveBeenCalledWith('/api/deployments/', data)
    })
  })

  describe('updateDeployment', () => {
    it('calls PUT /api/deployments/:id', async () => {
      await updateDeployment('d1', { traffic_port: 8080 })
      expect(mockPut).toHaveBeenCalledWith('/api/deployments/d1', { traffic_port: 8080 })
    })

    it('removes traffic_port when null', async () => {
      await updateDeployment('d1', { traffic_port: null, image_url: 'img:v2' })
      expect(mockPut).toHaveBeenCalledWith('/api/deployments/d1', { image_url: 'img:v2' })
    })
  })

  describe('updateDeploymentName', () => {
    it('calls PUT /api/deployments/:id/name', async () => {
      await updateDeploymentName('d1', 'New Name')
      expect(mockPut).toHaveBeenCalledWith('/api/deployments/d1/name', { name: 'New Name' })
    })
  })

  describe('extendDeployment', () => {
    it('calls POST /api/deployments/:id/extend', async () => {
      await extendDeployment('d1', 72)
      expect(mockPost).toHaveBeenCalledWith('/api/deployments/d1/extend', { duration_hours: 72 })
    })
  })

  describe('checkClusterNameAvailability', () => {
    it('calls GET /api/deployments/check-name', async () => {
      await checkClusterNameAvailability('my-cluster')
      expect(mockGet).toHaveBeenCalledWith('/api/deployments/check-name', {
        params: { name: 'my-cluster' },
      })
    })
  })
})
