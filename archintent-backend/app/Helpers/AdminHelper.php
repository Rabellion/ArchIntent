<?php

namespace App\Helpers;

use App\Models\AdminLog;

class AdminHelper
{
    /**
     * Log an admin action
     *
     * @param int $adminId
     * @param string $action
     * @param string|null $targetTable
     * @param int|null $targetId
     * @param string|null $description
     * @return AdminLog
     */
    public static function logAction($adminId, $action, $targetTable = null, $targetId = null, $description = null)
    {
        return AdminLog::create([
            'admin_id' => $adminId,
            'action' => $action,
            'target_table' => $targetTable,
            'target_id' => $targetId,
            'description' => $description,
        ]);
    }
}
