import { useEffect, useState } from "react";
import { CardInfo } from "@/components/ui/card-info";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Calendar, UserCheck, TrendingUp, PieChart, Clock, Bot, Zap, Activity } from "lucide-react";
import { mockMetrics, mockActivities, weeklyPerformanceData, conversionData, hourlyActivityData } from "@/lib/mock-data";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, AreaChart, Area, Pie } from "recharts";

export function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metrics, setMetrics] = useState(mockMetrics);
  const [activities] = useState(mockActivities);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    // Simulate metrics loading with staggered animation
    const metricsTimer = setTimeout(() => {
      setMetricsLoading(false);
    }, 1200);

    return () => {
      clearTimeout(timer);
      clearTimeout(metricsTimer);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-slate-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-600">Monitoramento em tempo real da Livia IA</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className={`transition-all duration-500 ${metricsLoading ? 'opacity-50' : 'opacity-100'}`}>
          <CardInfo
            title="Interações Hoje"
            value={metrics.mensagensHoje}
            icon={Mail}
            iconColor="bg-blue-100 text-medical-blue"
            trend={{ value: "+12% vs ontem", isPositive: true }}
          />
        </div>
        <div className={`transition-all duration-500 delay-150 ${metricsLoading ? 'opacity-50' : 'opacity-100'}`}>
          <CardInfo
            title="Sessões Agendadas"
            value={metrics.agendamentosHoje}
            icon={Calendar}
            iconColor="bg-green-100 text-medical-green"
            trend={{ value: "+5% vs ontem", isPositive: true }}
          />
        </div>
        <div className={`transition-all duration-500 delay-300 ${metricsLoading ? 'opacity-50' : 'opacity-100'}`}>
          <CardInfo
            title="Triagens Ativas"
            value={metrics.atendimentosAtivos}
            icon={UserCheck}
            iconColor="bg-purple-100 text-medical-purple"
            subtitle="Em andamento"
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Performance Semanal
            </CardTitle>
            <p className="text-sm text-slate-500">Interações e sessões nos últimos 7 dias</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="mensagens" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    name="Mensagens"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="agendamentos" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    name="Agendamentos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Taxa de Conversão
            </CardTitle>
            <p className="text-sm text-slate-500">Distribuição do funil de conversão</p>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Pie
                      data={conversionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {conversionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-32 flex flex-col justify-center space-y-3 pl-4">
                {conversionData.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
                      style={{ backgroundColor: item.fill }}
                    />
                    <div className="text-xs">
                      <div className="font-medium text-slate-800">{item.name}</div>
                      <div className="text-slate-500">{item.value}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Activity Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Atividade da IA por Horário
            </CardTitle>
            <p className="text-sm text-slate-500">Volume de interações da Livia ao longo do dia</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyActivityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="atividade"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    name="Atividade"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Status em Tempo Real
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bot className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Livia IA</span>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              <p className="text-xs text-green-600 mt-1">Respondendo em {metrics.tempoResposta}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-slate-700">Tempo Médio</span>
                </div>
                <span className="text-sm font-semibold text-slate-800">{metrics.tempoResposta}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-slate-700">Taxa Sucesso</span>
                </div>
                <span className="text-sm font-semibold text-green-600">{metrics.taxaSucesso}%</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-slate-700">Satisfação</span>
                </div>
                <span className="text-sm font-semibold text-purple-600">{metrics.satisfacao}/5</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Atividade Recente da Livia
          </CardTitle>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-600 font-medium">Ao vivo</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={activity.id} className="flex items-start space-x-4 p-4 bg-gradient-to-r from-slate-50 to-white rounded-lg border border-slate-100 hover:shadow-sm transition-shadow">
                <div className="flex-shrink-0 mt-1">
                  <div className={`w-3 h-3 rounded-full ${
                    activity.color === 'green' ? 'bg-green-500' :
                    activity.color === 'blue' ? 'bg-blue-500' :
                    activity.color === 'purple' ? 'bg-purple-500' : 'bg-slate-500'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 mb-1">{activity.action}</p>
                  <p className="text-xs text-slate-500 mb-2">{activity.details}</p>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      activity.color === 'green' ? 'bg-green-100 text-green-800' :
                      activity.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                      activity.color === 'purple' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {activity.status}
                    </span>
                    {index === 0 && (
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                        Mais recente
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-center">
              <button className="text-sm text-medical-blue hover:text-blue-700 font-medium">
                Ver todas as atividades →
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
