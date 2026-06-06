<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\TaskFile;
use Illuminate\Http\Request;

class FileController extends Controller
{
    public function index(Request $request)
    {
        $user = auth('api')->user();

        $files = TaskFile::with(['task:id,project_id,title', 'uploader:id,name'])
            ->whereHas('task.project', function ($q) use ($user) {
                $q->where('company_id', $user->company_id);
            })
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json([
            'data' => $files->items(),
            'pagination' => [
                'total' => $files->total(),
                'per_page' => $files->perPage(),
                'current_page' => $files->currentPage(),
                'last_page' => $files->lastPage(),
            ],
        ], 200);
    }
}
