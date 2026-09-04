<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SiteSettingResource;
use App\Models\SiteSetting;

/**
 * 公开站点基础资料（level = public）：首页品牌区、页脚联系方式的数据源。
 */
class SiteSettingController extends Controller
{
    public function show(): SiteSettingResource
    {
        return SiteSettingResource::make(SiteSetting::current());
    }
}
