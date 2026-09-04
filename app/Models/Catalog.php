<?php

namespace App\Models;

use Database\Factories\CatalogFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * 一本企业画册（前台翻页的最小完整单位）。
 */
#[Fillable([
    'slug', 'title', 'subtitle', 'cover_image', 'theme_color', 'summary', 'status', 'published_at', 'sort_order',
])]
class Catalog extends Model
{
    /** @use HasFactory<CatalogFactory> */
    use HasFactory;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_PUBLISHED = 'published';

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'sort_order'   => 'integer',
        ];
    }

    /**
     * @return HasMany<CatalogPage>
     */
    public function pages(): HasMany
    {
        return $this->hasMany(CatalogPage::class)->orderBy('sort_order');
    }

    /**
     * 前台/公开 API 唯一允许的取数口径：状态 + 发布时间同时满足。
     *
     * @param  Builder<Catalog>  $query
     */
    public function scopePublished(Builder $query): void
    {
        $query->where('status', self::STATUS_PUBLISHED)
              ->whereNotNull('published_at')
              ->orderByDesc('published_at')
              ->orderBy('sort_order');
    }

    public function isPublished(): bool
    {
        return $this->status === self::STATUS_PUBLISHED && $this->published_at !== null;
    }

    protected static function newFactory(): CatalogFactory
    {
        return CatalogFactory::new();
    }
}
