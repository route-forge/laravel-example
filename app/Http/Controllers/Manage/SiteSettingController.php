<?php

namespace App\Http\Controllers\Manage;

use App\Http\Controllers\Controller;
use App\Http\Resources\SiteSettingResource;
use App\Models\SiteSetting;
use Illuminate\Http\Request;

/**
 * 管理端基础资料维护（level = manage，web + manage 中间件保护）。
 *
 * 公开侧只有只读 show（见 Api\SiteSettingController）；这里提供整体更新。
 */
class SiteSettingController extends Controller
{
    public function update(Request $request): SiteSettingResource
    {
        $data = $request->validate([
            'site_name'       => ['required', 'string', 'max:200'],
            'brand_slogan'    => ['nullable', 'string', 'max:300'],
            'logo_url'        => ['nullable', 'string', 'max:500'],
            'intro'           => ['nullable', 'string'],
            'contact_phone'   => ['nullable', 'string', 'max:50'],
            'contact_email'   => ['nullable', 'email', 'max:200'],
            'contact_address' => ['nullable', 'string', 'max:500'],
            'icp'             => ['nullable', 'string', 'max:100'],
        ], [
            'site_name.required' => '请填写站点名称。',
            'contact_email.email' => '联系邮箱格式不正确。',
        ]);

        $setting = SiteSetting::current();
        $setting->update($data);

        return SiteSettingResource::make($setting->fresh());
    }
}
