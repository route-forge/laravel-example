<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * 站点基础资料（singleton）：迁移时已种下 id=1 的默认行，全站只有一份。
 *
 * 公开接口 api.site.show 输出全部字段（都是对外展示信息，无敏感项）；
 * 管理端 api.manage.site.update 整体更新。
 */
#[Fillable([
    'site_name', 'brand_slogan', 'logo_url', 'intro',
    'contact_phone', 'contact_email', 'contact_address', 'icp',
])]
class SiteSetting extends Model
{
    public const DEFAULT_SITE_NAME = '我的企业';

    /**
     * 单例取数：行丢失（如手工清库）时兜底重建，保证接口永不空态。
     */
    public static function current(): self
    {
        return static::query()->first()
            ?? static::query()->create(['site_name' => self::DEFAULT_SITE_NAME]);
    }
}
