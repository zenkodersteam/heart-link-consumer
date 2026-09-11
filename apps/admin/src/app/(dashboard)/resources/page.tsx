import { ToggleBadge } from '../../../components/ui/ToggleBadge';
import type { AdminResource, AdminResourceCategory } from '@heartlink/api-contract';
import { Button } from '../../../components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '../../../components/ui/card';
import { PageHero } from '../../../components/layout/PageHero';
import { ResourceCategoryFormDialog } from '../../../components/resources/ResourceCategoryFormDialog';
import { ResourceFormDialog } from '../../../components/resources/ResourceFormDialog';
import { serverApi } from '../../../lib/api';
import { isRedirectError } from '@/lib/redirect-error';

export const dynamic = 'force-dynamic';

export default async function ResourcesPage() {
  let loadError: string | null = null;
  let items: AdminResource[] = [];
  let categories: AdminResourceCategory[] = [];

  try {
    const api = await serverApi();
    const [resourcesResponse, categoryResponse] = await Promise.all([
      api.listAdminResources(),
      api.listResourceCategories(),
    ]);
    items = resourcesResponse.items;
    categories = categoryResponse;
  } catch (err) {
    // A missing session redirects; shown as a load error it read "NEXT_REDIRECT".
    if (isRedirectError(err)) throw err;
    loadError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="flex w-full flex-col gap-6 p-8">
      <PageHero
        eyebrow="Resources"
        title="Resources Directory"
        description="Curate the support directory people see in the consumer app so HeartLink offers real value even when mediated communication is slow."
        actions={
          <div className="flex flex-wrap gap-3">
            <ResourceCategoryFormDialog
              mode="create"
              trigger={
                <Button variant="outline" size="md">
                  + Add Category
                </Button>
              }
            />
            <ResourceFormDialog
              mode="create"
              categories={categories.filter((category) => category.isActive)}
              trigger={
                <Button variant="primary" size="md">
                  + Add Resource
                </Button>
              }
            />
          </div>
        }
      />

      {loadError ? (
        <Card>
          <CardBody className="px-5 py-6 text-sm text-text-muted">
            Unable to load resources right now.
          </CardBody>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Categories</CardTitle>
                <p className="mt-1 text-sm text-text-muted">
                  Keep the directory organized around real support themes.
                </p>
              </div>
            </CardHeader>
            <CardBody>
              {categories.length === 0 ? (
                <div className="px-5 py-6 text-sm text-text-muted">
                  No categories yet. Add the first support theme before publishing resources.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Scrolls on its own. A table has a natural minimum width, so on
                      a narrow screen it otherwise squashes its columns unreadably or
                      drags the whole page sideways. */}
                  <table className="w-full text-sm">
                    <thead className="bg-surface">
                      <tr className="border-b border-border text-left text-[12px] uppercase tracking-wide text-text-muted">
                        <th className="px-5 py-3 font-medium">Title</th>
                        <th className="px-5 py-3 font-medium">Slug</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 font-medium">Description</th>
                        <th className="px-5 py-3 font-medium">Order</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category, idx) => (
                        <tr
                          key={category.id}
                          className={idx % 2 === 0 ? 'border-b border-border' : 'border-b border-border bg-surface/40'}
                        >
                          <td className="px-5 py-3 font-medium text-text">{category.title}</td>
                          <td className="px-5 py-3 text-text-muted">{category.slug}</td>
                          <td className="px-5 py-3">
                            <ToggleBadge on={category.isActive} onLabel="Active" offLabel="Inactive" />
                          </td>
                          <td className="px-5 py-3 text-text-muted">
                            <span className="line-clamp-2 max-w-[420px]">{category.description ?? '—'}</span>
                          </td>
                          <td className="px-5 py-3 text-text-muted">{category.sortOrder}</td>
                          <td className="px-5 py-3 text-right">
                            <ResourceCategoryFormDialog
                              mode="edit"
                              category={category}
                              trigger={
                                <Button variant="outline" size="sm">
                                  Edit
                                </Button>
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Published resources</CardTitle>
                <p className="mt-1 text-sm text-text-muted">
                  Manage the live support links that back the consumer resources screen.
                </p>
              </div>
            </CardHeader>
            <CardBody>
              {items.length === 0 ? (
                <div className="px-5 py-6 text-sm text-text-muted">
                  No resources yet. Publish the first listing once a category exists.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Scrolls on its own. A table has a natural minimum width, so on
                      a narrow screen it otherwise squashes its columns unreadably or
                      drags the whole page sideways. */}
                  <table className="w-full text-sm">
                    <thead className="bg-surface">
                      <tr className="border-b border-border text-left text-[12px] uppercase tracking-wide text-text-muted">
                        <th className="px-5 py-3 font-medium">Title</th>
                        <th className="px-5 py-3 font-medium">Category</th>
                        <th className="px-5 py-3 font-medium">Published</th>
                        <th className="px-5 py-3 font-medium">Contact</th>
                        <th className="px-5 py-3 font-medium">Tags</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((resource, idx) => {
                        const category = categories.find((item) => item.id === resource.categoryId);
                        return (
                          <tr
                            key={resource.id}
                            className={idx % 2 === 0 ? 'border-b border-border' : 'border-b border-border bg-surface/40'}
                          >
                            <td className="px-5 py-3">
                              <div className="font-medium text-text">{resource.title}</div>
                              <div className="mt-1 line-clamp-2 max-w-[420px] text-xs text-text-muted">
                                {resource.description ?? 'No description yet.'}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-text-muted">{category?.title ?? resource.categorySlug}</td>
                            <td className="px-5 py-3">
                              <ToggleBadge on={resource.isPublished} onLabel="Published" offLabel="Draft" />
                            </td>
                            <td className="px-5 py-3 text-text-muted">
                              <div>{resource.organization ?? '—'}</div>
                              <div className="text-xs">{resource.phone ?? resource.url ?? '—'}</div>
                            </td>
                            <td className="px-5 py-3 text-text-muted">{resource.tags.length ? resource.tags.join(', ') : '—'}</td>
                            <td className="px-5 py-3 text-right">
                              <ResourceFormDialog
                                mode="edit"
                                resource={resource}
                                categories={categories.filter((category) => category.isActive || category.id === resource.categoryId)}
                                trigger={
                                  <Button variant="outline" size="sm">
                                    Edit
                                  </Button>
                                }
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
